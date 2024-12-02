import {StorageStrategy} from "./storage-strategy";
import {WorkflowStep} from "./step";
import {WorkflowContext} from "./context";
import {successResult} from "./result";

type WorkflowStatus = "pending" | "running" | "completed" | "failed";

abstract class BaseWorkflow {
    protected readonly name: string;
    protected readonly context: WorkflowContext;
    protected readonly steps: WorkflowStep<unknown, unknown>[];
    protected currentStepIndex = 0;

    constructor(options: DefineWorkflowOptions<unknown>) {
        this.name = options.name;
        this.steps = options.steps;
        this.context = options.setupContext ? options.setupContext(new WorkflowContext()) : new WorkflowContext();
    }

    protected async rollback() {
        const stepsToRollback = this.steps.slice(0, this.currentStepIndex).reverse();
        for (const step of stepsToRollback) {
            if (step.rollback) {
                await step.rollback(this.context);
            }
        }
    }
}


class StoredWorkflow<IDType> extends BaseWorkflow {
    private readonly storageStrategy: StorageStrategy<IDType>

    constructor(options: DefineWorkflowOptions<IDType> & { storageStrategy: StorageStrategy<IDType> }) {
        super(options);
        this.storageStrategy = options.storageStrategy;
    }

    public async run() {
        const workflowId = await this.storageStrategy.storeWorkflow(this.name);
        for (const step of this.steps) {
            const stepId = await this.storageStrategy.storeStep({workflowId, stepName: step.name});
            const stepResult = await step.run(this.context);
            if (stepResult.isErr) {
                await Promise.all([this.storageStrategy.updateStepStatus({
                    stepId,
                    status: "failed",
                    workflowId
                }), this.storageStrategy.updateWorkflowStatus({workflowId, status: "failed"})]);
                await this.rollback();
                return {...stepResult, stepName: step.name};
            }
            await this.storageStrategy.updateStepStatus({stepId, status: "completed", workflowId});
            this.currentStepIndex++;
        }
        await this.storageStrategy.updateWorkflowStatus({workflowId, status: "completed"});
        return successResult({id: workflowId});
    }
}

class InMemoryWorkflow extends BaseWorkflow {
    public async run() {
        for (const step of this.steps) {
            const stepResult = await step.run(this.context);
            if (stepResult.isErr) {
                await this.rollback();
                return {...stepResult, stepName: step.name};
            }
            this.currentStepIndex++;
        }
        return successResult({id: 1});
    }
}

interface DefineWorkflowOptions<IDType> {
    name: string;
    steps: WorkflowStep<unknown, unknown>[];
    storageStrategy?: StorageStrategy<IDType>;
    setupContext?: (context: WorkflowContext) => WorkflowContext;
}

function defineWorkflow<IDType>(options: DefineWorkflowOptions<IDType>) {
    const storageStrategy = options.storageStrategy;
    if (storageStrategy) {
        return new StoredWorkflow({...options, storageStrategy});
    }
    return new InMemoryWorkflow(options);
}

export {defineWorkflow, WorkflowStatus, BaseWorkflow};