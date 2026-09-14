import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCode from "@/components/docs/DocsCode";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Contributing",
  description: "How to contribute to TokenPrint — branch naming, commit conventions, and PR scope.",
};

export default function ContributingPage() {
  return (
    <>
      <DocsBreadcrumb slug="contributing" title="Contributing" />
      <h1>Contributing</h1>
      <p className="docs-meta">Reference</p>

      <p>
        TokenPrint is open source. Contributions are welcome — especially fixes to the known data
        fidelity gaps, new model architecture support, and debugger panel improvements.
      </p>

      <hr />

      <h2 id="setup">Setup</h2>

      <DocsCode lang="bash" code={`git clone https://github.com/Sudharsanselvaraj/Token-Print.git
cd Token-Print

# Backend
cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run dev`} />

      <hr />

      <h2 id="before-you-open-a-pr">Before opening a PR</h2>

      <DocsCode lang="bash" code={`# 1. Verify frontend data integrity
cd frontend
npm run build           # fails if Math.random found in app code

# 2. Verify backend data
cd ../backend
python3 scripts/verify_real_data.py
python3 scripts/verify_trace.py`} />

      <DocsCallout variant="important">
        <p>
          The data integrity check is enforced by <code>npm run build</code>. If your change
          introduces <code>Math.random</code> in application code, the build will fail. This is
          intentional — all numbers must be real.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="branch-naming">Branch naming</h2>

      <table>
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Use for</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>feat/</code></td>
            <td>New features</td>
            <td><code>feat/logit-lens-panel</code></td>
          </tr>
          <tr>
            <td><code>fix/</code></td>
            <td>Bug fixes</td>
            <td><code>fix/attention-row-sum</code></td>
          </tr>
          <tr>
            <td><code>docs/</code></td>
            <td>Documentation</td>
            <td><code>docs/update-api-reference</code></td>
          </tr>
          <tr>
            <td><code>chore/</code></td>
            <td>Build / tooling changes</td>
            <td><code>chore/upgrade-next15</code></td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="commit-conventions">Commit conventions</h2>

      <p>
        Use <a href="https://www.conventionalcommits.org" target="_blank" rel="noopener noreferrer">
          Conventional Commits
        </a>:
      </p>

      <DocsCode lang="text" code={`feat(ui): add provenance badge to tensor inspector
fix(backend): correct head ablation math
docs(api): add trace replay endpoint
chore(deps): upgrade three.js to r167`} />

      <hr />

      <h2 id="pr-scope">PR scope</h2>

      <p>
        Keep PRs focused on a single issue. A PR that fixes a data fidelity bug should not also
        refactor unrelated components. Reviewers look at:
      </p>

      <ul>
        <li>Does the change introduce any <code>Math.random</code> calls?</li>
        <li>Are all displayed numbers still traceable to a real model output?</li>
        <li>Does <code>npm run build</code> pass?</li>
        <li>Are TypeScript errors introduced?</li>
      </ul>

      <hr />

      <h2 id="good-first-issues">Good first issues</h2>

      <p>
        The <a href="https://github.com/Sudharsanselvaraj/Token-Print/blob/main/GOOD_FIRST_ISSUES.md" target="_blank" rel="noopener noreferrer">
          GOOD_FIRST_ISSUES.md
        </a>{" "}
        file has curated beginner tasks organized by difficulty, with specific files to touch and
        how to verify the change.
      </p>

      <DocsPrevNext slug="contributing" />
    </>
  );
}
