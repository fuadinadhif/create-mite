#!/usr/bin/env node
import prompts from "prompts";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

(async () => {
  let projectName, targetDir;
  let sourceDir = path.resolve(
    fileURLToPath(import.meta.url),
    "../../template"
  );

  if (process.argv.length <= 2) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "What's your project name?",
      initial: "my-project",
      format: (val) => val.toLowerCase().split(" ").join("-"),
      validate: (val) =>
        /^[a-zA-Z0-9-]+$/.test(val)
          ? true
          : "Project name should not contain special characters (including space) except hyphens (-).",
    });

    projectName = response.projectName;
  } else {
    if (process.argv[2] === ".")
      throw new Error("Cannot use current folder as project directory.");
    projectName = process.argv[2];
  }

  targetDir = path.join(process.cwd(), projectName);

  async function makeProject(source, destination) {
    try {
      const files = await fs.readdir(source);

      for (const file of files) {
        const sourcePath = path.join(source, file);
        const destinationPath = path.join(destination, file);

        try {
          const stat = await fs.lstat(sourcePath);

          if (stat.isDirectory()) {
            await fs.mkdir(destinationPath);
            await makeProject(sourcePath, destinationPath);
          } else {
            await fs.copyFile(sourcePath, destinationPath);
          }
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function renamePackageJSON(target, packageName) {
    const packageJSONPath = path.join(target, "package.json");

    try {
      const packageJSON = await fs.readFile(packageJSONPath, "utf-8");
      const parsed = JSON.parse(packageJSON);

      parsed.name = packageName;

      const data = JSON.stringify(parsed, null, 2);
      await fs.writeFile(packageJSONPath, data, "utf-8");
    } catch (error) {
      console.error(error);
    }
  }

  try {
    await fs.access(targetDir);
    throw new Error("Target directory already exists.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Creating directory...");
      await fs.mkdir(targetDir);
      await makeProject(sourceDir, targetDir);
      await renamePackageJSON(targetDir, projectName);
      console.log("Project created successfully. \n");
      console.log("Done. Now run: \n");
      console.log(`  cd ${projectName}`);
      console.log("  npm install");
    } else {
      console.error(error);
    }
  }
})();
