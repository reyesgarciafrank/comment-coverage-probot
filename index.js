// Deployments API example
// See: https://developer.github.com/v3/repos/deployments/ to learn more

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.synchronize",
      "pull_request.reopened",
    ],
    async (context) => {
      // Post a comment on the issue
      const pr = context.payload.pull_request;
      const org = pr.base.repo.owner.login;
      const repo = pr.base.repo.name;
      let pull_number = context.payload.pull_request.number;
      let message = "";
      // create check queue

      context.octokit.checks.create({
        headers: {
          // accept: "application/vnd.github.v3+json"
          accept: "application/vnd.github.antiope-preview+json",
        },
        owner: org,
        repo: repo,
        name: "Comment bot",
        status: "queued",
        started_at: new Date().toISOString(),
        head_sha: pr.head.sha,
        output: {
          title: "Comment bot",
          summary: "The Comment bot will begin shortly",
        },
      });

      const changedFiles = await context.octokit.paginate(
        context.octokit.pulls.listFiles,
        { owner: org, repo, pull_number, per_page: 100 }
      );
      let not_comment = false;
      for (const file of changedFiles) {
        const lines = file.patch.match(/(\n\+)+\s*[^\d\+](.*)/g);

        if (lines) {
          lines.forEach((line, index) => {
            line;
            const match =
              line.indexOf("public") === -1 ? line.indexOf("private") : 0;
            if (match != -1) {
              if (index > 0) {
                const l = lines[index - 1];
                if (l !== "\n+" || l !== "-") {
                  if (l.match(/\*\//) || l.match(/[/\t]*[/\n]*[/\s]*\/\//)) {
                    not_comment = false;
                  } else {
                    not_comment = true;
                    message = "The method does not have an associated comment";
                  }
                }
              } else {
                not_comment = true;
                message =
                  "It is not possible to verify if the method has an associated comment";
              }
            }
          });
        }
      }

      const conclusion = not_comment ? "action_required" : "success";
      return context.octokit.checks.create({
        owner: org,
        repo: repo,
        name: "Comment bot",
        head_sha: pr.head.sha,
        status: "completed",
        conclusion: conclusion,
        completed_at: new Date().toISOString(),
        output: {
          title: "Comment bot",
          summary: message,
        },
      });
    }
  );
};
