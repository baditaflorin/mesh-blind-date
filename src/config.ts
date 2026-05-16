import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-blind-date",
  description:
    "Speed-dating style rotation — fill a profile, system reveals mutual interest at end",
  accentHex: "#f472b6",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
