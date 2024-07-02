const { auth, drive } = require("@googleapis/drive");

const base64Decode = (data) => {
  const buff = Buffer.from(data, "base64");
  return buff.toString("ascii");
};

const serviceB64 = JSON.parse(base64Decode(process.env.GD_SERVICE_B64));
const serviceAccount = {
  email: serviceB64.client_email,
  key: serviceB64.private_key,
  projectId: serviceB64.project_id,
  clientId: serviceB64.client_id,
  scopes: ["https://www.googleapis.com/auth/drive"],
};

let gdrive;

const serviceAccountAuth = new auth.GoogleAuth({
  credentials: {
    type: "service_account",
    private_key: serviceAccount.key,
    client_email: serviceAccount.email,
    client_id: serviceAccount.clientId,
  },
  projectId: serviceAccount.projectId,
  scopes: serviceAccount.scopes,
});

if (!gdrive) {
  gdrive = drive({
    version: "v3",
    auth: serviceAccountAuth,
  });
}

module.exports = {
    gdrive
}
