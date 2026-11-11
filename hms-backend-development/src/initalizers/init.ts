import inquirer from "inquirer";
import { createDoctors } from "./createDoctors";
import { createDepartments } from "./createDepartments";
import { createTimeSlots } from "./createTimeSlots";
import { createQualifications } from "./createQualifications";
import { createOrganization } from "./createOrganization";
import { createPermissions } from "./createPermissions"
import { createMedicalItems } from "./createMedicalItems";

interface Task {
    name: string;
    fn: () => void | Promise<void>;
}

async function runSelectedFunctions(tasks: Task[]): Promise<void> {
    const { selectedFns } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selectedFns",

            message: "Select the functions you would like to run:",
            choices: tasks.map((task) => ({
                name: task.name,
                value: task.fn,
            })),
        },
    ]);

    for (const fn of selectedFns) {
        await fn();
    }
}
runSelectedFunctions([
    {
        name: "Create Time Slots",
        fn: async () => {
            await createTimeSlots();
        },
    },
    {
        name: "Create Departments",
        fn: async () => {
            await createDepartments();
        },
    },
    {
        name: "Create Qualifications",
        fn: async () => {
            await createQualifications();
        },
    },
    {
        name: "Create Doctors",
        fn: async () => {
            await createDoctors();
        },
    },
    {
        name: "Create Organization",
        fn: async () => {
            await createOrganization();
        },
    },
    {
        name: "Create Permissions",
        fn: async () => {
            await createPermissions();
        },
    },
    {
        name: "Create Medical Items",
        fn: async () => {
            await createMedicalItems();
        },
    },
]);
