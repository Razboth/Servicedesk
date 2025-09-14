import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get contributors from git shortlog
    const { stdout } = await execAsync(
      'git shortlog -sn --all --no-merges'
    );

    // Parse the output
    const contributors = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          const [, commits, name] = match;
          return {
            login: name.trim(),
            contributions: parseInt(commits, 10),
            // Generate avatar from name
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            html_url: '#',
            name: name.trim()
          };
        }
        return null;
      })
      .filter(contributor => contributor !== null)
      .slice(0, 10); // Top 10 contributors

    return NextResponse.json(contributors);
  } catch (error) {
    console.error('Error fetching contributors:', error);
    return NextResponse.json([], { status: 500 });
  }
}