const config = require("../utils/config");
const { encryptData, decryptData } = require("../utils/crypto");
const { gdrive } = require("./gdriveInstant");

async function CheckPaths(paths){
  try {
    let decryptedSharedDrive;
    if (config.apiConfig.isTeamDrive && config.apiConfig.sharedDrive) {
      decryptedSharedDrive = await decryptData(config.apiConfig.sharedDrive);
    }

    const promises = [];
    for (const path of paths) {
      promises.push(
        gdrive.files
          .list({
            q: `name = '${decodeURIComponent(path).replace(new RegExp("'","gi"),"\\'")}' and trashed = false`,
            fields: "files(id, name, mimeType, parents)",
            ...(decryptedSharedDrive && {
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              driveId: decryptedSharedDrive,
              corpora: "drive",
            }),
          })
          .then(({ data }) => {
            if (!data.files?.length) return null;
            return {
              path,
              data: data.files.map((file) => ({
                id: file.id,
                parents: file.parents?.[0],
                mimeType: file.mimeType,
              })),
            };
          }),
      );
    }

    const data = await Promise.all(promises);
    const notFoundIndex = data.findIndex((item) => !item);
    if (notFoundIndex !== -1) throw new Error(`Path not found: ${paths[notFoundIndex]}`);
    let valid = true;
    let invalidPath;
    const decryptedRootId = await decryptData(config.apiConfig.rootFolder);
    const dataWithIndex = data.map((item, index) => {
      return {
        ...item,
        index: index,
      };
    });
    const filteredPaths = [];

    for (const item of dataWithIndex) {
      if (!valid) break;
      for (const path of item.data || []) {
        if (item.index === 0) {
          if (path.parents === decryptedRootId || path.parents === decryptedSharedDrive) {
            filteredPaths.push({
              path: item.path,
              data: [{ id: path.id, parents: path.parents, mimeType: path.mimeType }],
            });
            break;
          }
        } else {
          if (path.parents === filteredPaths[item.index - 1]?.data?.[0].id) {
            filteredPaths.push({
              path: item.path,
              data: [{ id: path.id, parents: path.parents, mimeType: path.mimeType }],
            });
            break;
          }
        }
      }
    }
    if (filteredPaths.length !== paths.length) {
      valid = false;
      invalidPath = dataWithIndex[filteredPaths.length]?.path;
    }

    if (!valid) throw new Error(`Invalid path: ${invalidPath}`);

    const ids = [];
    for (const item of filteredPaths) {
      if (item) {
        const encryptedId = await encryptData(item.data[0].id);
        ids.push({
          path: decodeURIComponent(item.path),
          id: encryptedId,
        });
      }
    }
    return {
      success: true,
      data: ids,
    };
  } catch (error) {
    const e = error;
    return {
      success: false,
      message: e.message,
    };
  }
}

module.exports = {CheckPaths}
