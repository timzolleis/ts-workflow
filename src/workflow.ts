import {successResult} from "./result";
import {StorageStrategy} from "./storage-strategy";
import {WorkflowContext} from "./context";
import {WorkflowStep} from "./step";

type WorkflowStatus = "pending" | "running" | "completed" | "failed";

interface DefineWorkflowOptions<IDType, T = never> {
    name: string;
    steps: WorkflowStep<unknown, unknown>[];
    storageStrategy?: StorageStrategy<IDType>;
    setupContext?: (data: T, context: WorkflowContext) => void;
}

class BaseWorkflow<IDType, T = never> {
    protected readonly name: string;
    protected readonly context: WorkflowContext;
    protected readonly steps: WorkflowStep<unknown, unknown>[];
    protected setupContext?: (data: T, context: WorkflowContext) => void;
    protected currentStepIndex = 0;

    constructor(options: DefineWorkflowOptions<IDType, T>) {
        this.name = options.name;
        this.steps = options.steps;
        this.context = new WorkflowContext();
        this.setupContext = options.setupContext;
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

class StoredWorkflow<IDType, T = never> extends BaseWorkflow<IDType, T> {
    private readonly storageStrategy: StorageStrategy<IDType>;

    constructor(options: DefineWorkflowOptions<IDType, T> & { storageStrategy: StorageStrategy<IDType> }) {
        super(options);
        this.storageStrategy = options.storageStrategy;
    }

    public async run(data?: T) {
        if (this.setupContext && data) {
            this.setupContext(data, this.context);
        }
        const workflowId = await this.storageStrategy.storeWorkflow(this.name);
        for (const step of this.steps) {
            const stepId = await this.storageStrategy.storeStep({ workflowId, stepName: step.name });
            const stepResult = await step.run(this.context);
            if (stepResult.isErr) {
                await Promise.all([
                    this.storageStrategy.updateStepStatus({ stepId, status: "failed", workflowId }),
                    this.storageStrategy.updateWorkflowStatus({ workflowId, status: "failed" })
                ]);
                await this.rollback();
                return { ...stepResult, stepName: step.name };
            }
            await this.storageStrategy.updateStepStatus({ stepId, status: "completed", workflowId });
            this.currentStepIndex++;
        }
        await this.storageStrategy.updateWorkflowStatus({ workflowId, status: "completed" });
        return successResult({ id: workflowId });
    }
}

class InMemoryWorkflow<T = never> extends BaseWorkflow<unknown, T> {
    public async run(data?: T) {
        if (this.setupContext && data) {
            this.setupContext(data, this.context);
        }
        for (const step of this.steps) {
            const stepResult = await step.run(this.context);
            if (stepResult.isErr) {
                await this.rollback();
                return { ...stepResult, stepName: step.name };
            }
            this.currentStepIndex++;
        }
        return successResult({ id: 1 });
    }
}

function defineWorkflow<IDType, T = never>(options: DefineWorkflowOptions<IDType, T>) {
    const storageStrategy = options.storageStrategy;
    if (storageStrategy) {
        return new StoredWorkflow({ ...options, storageStrategy });
    }
    return new InMemoryWorkflow(options);
}

export {defineWorkflow, WorkflowStatus};