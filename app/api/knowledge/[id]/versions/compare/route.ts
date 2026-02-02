import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

// Simple line-by-line diff algorithm
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Use longest common subsequence for better diff
  const lcs = longestCommonSubsequence(oldLines, newLines);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length) {
      // Process removed lines (in old but not in LCS at this position)
      while (oldIdx < oldLines.length && oldLines[oldIdx] !== lcs[lcsIdx]) {
        result.push({
          type: 'removed',
          content: oldLines[oldIdx],
          lineNumber: { old: oldIdx + 1 },
        });
        oldIdx++;
      }

      // Process added lines (in new but not in LCS at this position)
      while (newIdx < newLines.length && newLines[newIdx] !== lcs[lcsIdx]) {
        result.push({
          type: 'added',
          content: newLines[newIdx],
          lineNumber: { new: newIdx + 1 },
        });
        newIdx++;
      }

      // Process unchanged line (in LCS)
      if (oldIdx < oldLines.length && newIdx < newLines.length) {
        result.push({
          type: 'unchanged',
          content: oldLines[oldIdx],
          lineNumber: { old: oldIdx + 1, new: newIdx + 1 },
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      }
    } else {
      // Process remaining old lines (all removed)
      while (oldIdx < oldLines.length) {
        result.push({
          type: 'removed',
          content: oldLines[oldIdx],
          lineNumber: { old: oldIdx + 1 },
        });
        oldIdx++;
      }

      // Process remaining new lines (all added)
      while (newIdx < newLines.length) {
        result.push({
          type: 'added',
          content: newLines[newIdx],
          lineNumber: { new: newIdx + 1 },
        });
        newIdx++;
      }
    }
  }

  return result;
}

// Find longest common subsequence
function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// GET /api/knowledge/[id]/versions/compare - Compare two versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fromVersionId = searchParams.get('from');
    const toVersionId = searchParams.get('to');

    if (!fromVersionId || !toVersionId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Both from and to version IDs are required' },
        { status: 400 }
      );
    }

    // Verify article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Fetch both versions
    const [fromVersion, toVersion] = await Promise.all([
      prisma.knowledgeVersion.findUnique({
        where: { id: fromVersionId },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.knowledgeVersion.findUnique({
        where: { id: toVersionId },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    if (!fromVersion || fromVersion.articleId !== id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'From version not found' },
        { status: 404 }
      );
    }

    if (!toVersion || toVersion.articleId !== id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'To version not found' },
        { status: 404 }
      );
    }

    // Compute diffs for title, summary, and content
    const titleDiff = fromVersion.title !== toVersion.title
      ? {
          changed: true,
          old: fromVersion.title,
          new: toVersion.title,
        }
      : { changed: false };

    const summaryDiff = fromVersion.summary !== toVersion.summary
      ? {
          changed: true,
          old: fromVersion.summary || '',
          new: toVersion.summary || '',
        }
      : { changed: false };

    const contentDiff = computeDiff(fromVersion.content, toVersion.content);

    // Calculate statistics
    const addedLines = contentDiff.filter((l) => l.type === 'added').length;
    const removedLines = contentDiff.filter((l) => l.type === 'removed').length;
    const unchangedLines = contentDiff.filter((l) => l.type === 'unchanged').length;

    return NextResponse.json({
      success: true,
      data: {
        fromVersion: {
          id: fromVersion.id,
          version: fromVersion.version,
          createdAt: fromVersion.createdAt,
          author: fromVersion.author,
          changeNotes: fromVersion.changeNotes,
          isStable: fromVersion.isStable,
        },
        toVersion: {
          id: toVersion.id,
          version: toVersion.version,
          createdAt: toVersion.createdAt,
          author: toVersion.author,
          changeNotes: toVersion.changeNotes,
          isStable: toVersion.isStable,
        },
        diff: {
          title: titleDiff,
          summary: summaryDiff,
          content: contentDiff,
        },
        stats: {
          addedLines,
          removedLines,
          unchangedLines,
          totalChanges: addedLines + removedLines,
        },
      },
    });
  } catch (error) {
    console.error('Error comparing versions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to compare versions' },
      { status: 500 }
    );
  }
}
