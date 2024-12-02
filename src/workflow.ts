import {WorkflowStep} from "./step";
import {WorkflowContext} from "./context";
import {errorResult, successResult} from "./result";
import {StorageStrategy} from "./storage-strategy";

type WorkflowStatus = "pending" | "running" | "completed" | "failed";

class BaseWorkflow<IDType> {
    private readonly name: string;
    protected readonly context: WorkflowContext;
    protected readonly steps: WorkflowStep<unknown, unknown>[];
    private readonly storageStrategy?: StorageStrategy<IDType>;

    private currentStepIndex = 0;
    private id?: IDType;

    constructor(options: DefineWorkflowOptions<IDType>) {
        this.name = options.name;
        this.steps = options.steps;
        this.context = options.setupContext ? options.setupContext(new WorkflowContext()) : new WorkflowContext();
        this.storageStrategy = options.storageStrategy;

    }

    public async run() {
        if (this.storageStrategy) {
            this.id = await this.storageStrategy.storeWorkflow(this.name);
        }
        for (const step of this.steps) {
            const stepId = await this.storeStep(step.name);
            const result = await step.run(this.context);
            if (result && result.isErr) {
                await this.updateStepStatus({stepId, status: "failed"});
                await this.rollback();
                return errorResult({
                    failedStep: step.name,
                    error: result.error,
                    id: this.id
                });
            }
            await this.updateStepStatus({stepId, status: "completed"});
            this.currentStepIndex++;
        }
        if (this.storageStrategy && this.id) {
            await this.storageStrategy.updateWorkflowStatus({workflowId: this.id, status: "completed"});
        }
        return successResult({id: this.id});
    }

    private async rollback() {
        const stepsToRollback = this.steps.slice(0, this.currentStepIndex).reverse();
        for (const step of stepsToRollback) {
            if (step.rollback) {
                await step.rollback(this.context);
            }
        }
    }

    private async updateStepStatus(params: { stepId: IDType | undefined; status: WorkflowStatus }) {
        if (!this.id || !this.storageStrategy || !params.stepId) {
            return;
        }
        await this.storageStrategy.updateStepStatus({
            stepId: params.stepId,
            status: params.status,
            workflowId: this.id
        });
    }


    private async storeStep(name: string) {
        if (!this.id || !this.storageStrategy) {
            return undefined;
        }
        return await this.storageStrategy.storeStep({
            workflowId: this.id,
            stepName: name
        });
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

export {defineWorkflow, WorkflowStatus};