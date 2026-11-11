import { Router } from "express";
import { EmployeeController } from "../controllers/employee.controller";
import { employeeValidator } from "../validators/employee.validator";

const EmployeeRouter = Router();

EmployeeRouter.post("/createEmployee", employeeValidator.createEmployee, EmployeeController.createEmployee);
EmployeeRouter.get("/getEmployee/:id", EmployeeController.getEmployee);
EmployeeRouter.get("/getAllEmployees", EmployeeController.getAllEmployees);
EmployeeRouter.get("/getAllEmployeesWithoutPagination", EmployeeController.getAllEmployeesWithoutPagination);
EmployeeRouter.put("/updateEmployee/:id", EmployeeController.updateEmployee);
EmployeeRouter.delete("/deleteEmployee/:id", EmployeeController.deleteEmployee);

export { EmployeeRouter };
