const { authorize } = require("../gmailAuth");

authorize().then(() => {
  console.log("✅ Gmail connected!");
});