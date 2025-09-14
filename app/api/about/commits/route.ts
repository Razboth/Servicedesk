import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get recent commits from git log
    const { stdout } = await execAsync(
      'git log --pretty=format:\'{"sha":"%H","message":"%s","author":"%an","date":"%ai","shortSha":"%h"}\' -30'
    );

    // Parse the output into JSON objects
    const commits = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const commit = JSON.parse(line);
          return {
            sha: commit.sha,
            commit: {
              message: commit.message,
              author: {
                name: commit.author,
                date: commit.date
              }
            },
            html_url: `https://github.com/Razboth/Servicedesk/commit/${commit.sha}`,
            shortSha: commit.shortSha
          };
        } catch (e) {
          return null;
        }
      })
      .filter(commit => commit !== null);

    return NextResponse.json(commits);
  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json([], { status: 500 });
  }
}