import {WorkflowStatus} from "./workflow";


interface StorageStrategy<IDType> {
    storeWorkflow(name: string): Promise<IDType>

    updateWorkflowStatus({workflowId, status}: { workflowId: IDType, status: WorkflowStatus }): Promise<void>

    storeStep({workflowId, stepName}: { workflowId: IDType, stepName: string }): Promise<IDType>

    updateStepStatus({workflowId, stepId, status}: {
        workflowId: IDType,
        stepId: IDType,
        status: WorkflowStatus
    }): Promise<void>
}
export {StorageStrategy}