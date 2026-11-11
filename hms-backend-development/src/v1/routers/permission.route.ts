import { Router } from "express";
import { PermissionController } from "@/v1/controllers/permission.controller";
import { authorize } from "../middlewares/permission.middleware";

const PermissionRouter = Router();

PermissionRouter.get("/getAllPermissions", authorize(["permissions"]), PermissionController.getAllPermissions);
PermissionRouter.get("/getAllRoles", authorize(["permissions"]), PermissionController.getAllRoles);
PermissionRouter.get("/getPermissionsForRole/:roleId", authorize(["permissions"]), PermissionController.getPermissionsForRole);
PermissionRouter.put("/updatePermissionsForRole/:roleId", authorize(["permissions"]), PermissionController.updatePermissionsForRole);
PermissionRouter.post("/createRole", authorize(["permissions"]), PermissionController.createRole);
PermissionRouter.put("/updateRole/:roleId", authorize(["permissions"]), PermissionController.updateRole);
PermissionRouter.delete("/deleteRole/:roleId", authorize(["permissions"]), PermissionController.deleteRole);
export { PermissionRouter };
