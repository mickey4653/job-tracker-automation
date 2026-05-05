// scorer.js
function scoreJob(job) {
  let score = 0;

  const title = job.role?.toLowerCase() || "";
  const company = job.company?.toLowerCase() || "";
  const location = job.location?.toLowerCase() || "";

  // Seniority
  if (title.includes("senior")) score += 3;
  if (title.includes("lead")) score += 4;
  if (title.includes("principal")) score += 5;
  if (title.includes("staff")) score += 4;
  if (title.includes("junior")) score -= 1;

  // Company boost (expand as needed)
  if (company.includes("lockheed")) score += 5;
  if (company.includes("pyramid")) score += 2;

  // Location
  if (location.includes("remote")) score += 2;

  return score;
}

module.exports = { scoreJob };
