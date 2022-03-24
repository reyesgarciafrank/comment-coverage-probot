import { Context } from "probot";
import { Config } from "./config";

async function handlePullRequestChange(context: Context) {
  const cfg = await context.config(".github/4yes.yml", Config);

  if (!cfg) return;

  const pr = context.payload.pull_request;
  if (!pr || pr.state !== "open") return;

  const org = pr.base.repo.owner.login;
  const repo = pr.base.repo.name;

  const files = await context.octokit.pulls.listFiles({
    pull_number: pr.number,
    owner: org,
    repo: repo,
  });
  const feedback = [];

  for (const file of files.data) {
    const addedlines = file.patch.match(/(\n\+)+\s*[^\d\+](.*)/g);

  }
  const action_required = feedback.length > 0;
  const conclusion = action_required ? "action_required" : "success";
  const title = action_required
    ? feedback.length + " Issues found"
    : "No issues found";
  let summary = "";
  if (action_required) {
    for (const issue of feedback) {
      summary += "### " + issue.reason.title + "\n";
      summary += "**File:** " + issue.file + "\n";
      summary += "```\n" + issue.code + " \n```\n";
      summary += "\n " + issue.reason.details;

      if (issue.reason.link) {
        summary += "\n\n [More information](" + issue.reason.link + ")";
      }
    }
  }

  return context.octokit.checks.create({
    owner: org,
    repo: repo,
    name: "File Scanner",
    head_sha: pr.head.sha,
    status: "completed",
    conclusion: conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: title,
      summary: summary,
    },
  });
  // })
}

module.exports = handlePullRequestChange;
