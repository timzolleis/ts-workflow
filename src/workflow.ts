import { StorageStrategy } from "./storage-strategy";
import { WorkflowStep } from "./step";
import { WorkflowContext } from "./context";
import { ErrorResult, successResult } from "./result";

type WorkflowStatus = "pending" | "running" | "completed" | "failed";

class BaseWorkflow<IDType> {
    private readonly name: string;
    protected readonly context: WorkflowContext;
    protected readonly steps: WorkflowStep<unknown, unknown>[];
    private readonly storageStrategy?: StorageStrategy<IDType>;
    private currentStepIndex = 0;

    constructor(options: DefineWorkflowOptions<IDType>) {
        this.name = options.name;
        this.steps = options.steps;
        this.context = options.setupContext ? options.setupContext(new WorkflowContext()) : new WorkflowContext();
        this.storageStrategy = options.storageStrategy;
    }

    public async run() {
        const workflowId = await this.storeWorkflow(this.name);
        for (const step of this.steps) {
            const stepId = workflowId ? await this.storeStep(step.name, workflowId) : undefined;
            const stepResult = await step.run(this.context);
            if (stepResult.isErr) {
                return await this.handleFailure({ result: stepResult, stepId, workflowId, stepName: step.name });
            }
            if (workflowId && stepId) {
                await this.updateStepStatus({ stepId, status: "running", workflowId });
            }
            this.currentStepIndex++;
        }
        if (workflowId) {
            await this.updateWorkflowStatus({ workflowId, status: "completed" });
        }
        return successResult({ id: workflowId });
    }

    private async handleFailure({ result, stepId, workflowId, stepName }: { result: ErrorResult<unknown>, stepId?: IDType, workflowId?: IDType, stepName: string }) {
        if (workflowId && stepId) {
            await this.updateStepStatus({ stepId, status: "failed", workflowId });
            await this.updateWorkflowStatus({ workflowId, status: "failed" });
        }
        await this.rollback();
        return {...result, stepName};
    }

    private async rollback() {
        const stepsToRollback = this.steps.slice(0, this.currentStepIndex).reverse();
        for (const step of stepsToRollback) {
            if (step.rollback) {
                await step.rollback(this.context);
            }
        }
    }

    private async updateStepStatus({ stepId, status, workflowId }: { stepId: IDType, status: WorkflowStatus, workflowId: IDType }) {
        if (this.storageStrategy) {
            await this.storageStrategy.updateStepStatus({ stepId, status, workflowId });
        }
    }

    private async updateWorkflowStatus({ workflowId, status }: { workflowId: IDType, status: WorkflowStatus }) {
        if (this.storageStrategy) {
            await this.storageStrategy.updateWorkflowStatus({ workflowId, status });
        }
    }

    private async storeStep(name: string, workflowId: IDType) {
        if (this.storageStrategy) {
            return this.storageStrategy.storeStep({ workflowId, stepName: name });
        }
        return undefined;
    }

    private async storeWorkflow(name: string) {
        if (this.storageStrategy) {
            return this.storageStrategy.storeWorkflow(name);
        }
        return undefined;
    }
}

interface DefineWorkflowOptions<IDType> {
    name: string;
    steps: WorkflowStep<unknown, unknown>[];
    storageStrategy?: StorageStrategy<IDType>;
    setupContext?: (context: WorkflowContext) => WorkflowContext;
}

function defineWorkflow<IDType>(options: DefineWorkflowOptions<IDType>) {
    return new BaseWorkflow(options);
}

export { defineWorkflow, WorkflowStatus };