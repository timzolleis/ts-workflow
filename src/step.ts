import {WorkflowContext} from "./context";
import {errorResult, Result, successResult} from "./result";




interface WorkflowStep<T, E> {
    name: string;

    run(context: WorkflowContext): Promise<Result<T, E>>

    rollback?(context: WorkflowContext): Promise<void>;
}

interface DefineStepOptions<T, E> {
    name: string;
    rollback?: WorkflowStep<T, E>['rollback'];
    run: () => Promise<Result<T, E>> | Promise<void>
}

class BaseWorkflowStep<T, E> implements WorkflowStep<T, E> {
    public readonly name: string;
    readonly #run: (context: WorkflowContext) => Promise<Result<T, E>> | Promise<void>;
    public readonly rollback?: WorkflowStep<T, E>['rollback'];

    constructor(options: DefineStepOptions<T, E>) {
        this.name = options.name;
        this.#run = options.run;
        this.rollback = options.rollback;
    }

    /**
     * Wrap the original run method in a try/catch block to prevent the workflow from crashing
     */
    public async run(context: WorkflowContext): Promise<Result<T, E>>  {
        try {
            const result = await this.#run(context);
            if (!result) {
                return successResult({} as T);
            }
            return this.isResult(result) ? result : successResult(result)
        } catch (error) {
            return errorResult(error) as Result<T, E>;
        }
    }

    private isResult(value: unknown): value is Result<T, E> {
        return !!value?.hasOwnProperty('isOk') && value.hasOwnProperty('isErr');
    }
}

function defineStep<T, E>(options: DefineStepOptions<T, E>): WorkflowStep<T, E> {
    return new BaseWorkflowStep(options);
}

export {WorkflowStep, defineStep};