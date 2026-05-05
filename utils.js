function extractCompany(from, subject) {
  const emailMatch = from.match(/<([^>]+)>/) || [];
  const email = emailMatch[1] || from;

  const domain = email.split("@")[1] || "";

  const blacklist = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "linkedin.com",
  ];

  if (!blacklist.includes(domain)) {
    return domain.split(".")[0];
  }

  // fallback: try subject for company
  const subjectMatch = subject.match(/at\s+([A-Za-z0-9 .]+)/i);
  if (subjectMatch) return subjectMatch[1].trim();

  return from.split("<")[0].trim();
}

function extractRole(subject) {
  const cleaned = subject
    .replace(/re:/i, "")
    .replace(/job opportunity:?/i, "")
    .trim();

  const patterns = [
    /(Senior|Junior|Lead|Principal)\s+[A-Za-z ]+/i,
    /(Software Engineer|Data Scientist|Developer|Backend Engineer|Frontend Engineer)/i,
  ];

  for (const p of patterns) {
    const match = cleaned.match(p);
    if (match) return match[0].trim();
  }

  return cleaned.split("-")[0].trim() || "Unknown Role";
}

module.exports = { extractCompany, extractRole };
