const { auth, drive } = require("@googleapis/drive");
const csDrive = require('../utils/csDrive.json')

const serviceAccountAuth = new auth.GoogleAuth({
  credentials: {
    type: "service_account",
    private_key: csDrive.private_key,
    client_email: csDrive.client_email,
    client_id: csDrive.client_id,
  },
  projectId: csDrive.project_id,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

module.exports = {
  gdrive: drive({ version: "v3", auth: serviceAccountAuth })
}
