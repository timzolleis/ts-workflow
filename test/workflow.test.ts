import {beforeEach, describe, expect, it, vi} from 'vitest';
import {defineStep, WorkflowStep} from "../src/step";
import {StorageStrategy} from "../src/storage-strategy";
import {errorResult, Result, successResult} from "../src/result";
import {defineWorkflow} from "../src/workflow";

describe('BaseWorkflow', () => {
    let steps: WorkflowStep<unknown, unknown>[];
    let storageStrategy: StorageStrategy<string>;

    beforeEach(() => {
        steps = [
            defineStep({
                name: 'step1',
                run: async (): Promise<Result<string, unknown>> => successResult('step1 success')
            }),
            defineStep({
                name: 'step2',
                run: async () => successResult('step2 success'),
                rollback: vi.fn(async () => {
                })
            })
        ];
        storageStrategy = {
            storeWorkflow: vi.fn(async () => 'workflowId'),
            updateWorkflowStatus: vi.fn(async () => {
            }),
            storeStep: vi.fn(async () => 'stepId'),
            updateStepStatus: vi.fn(async () => {
            })
        };
    });

    it('should run all steps successfully', async () => {
        const workflow = defineWorkflow({
            name: 'testWorkflow',
            steps,
            storageStrategy
        });
        const result = await workflow.run();
        if (result.isOk) {
            expect(result.data.id).toBe('workflowId');
        } else {
            throw new Error('Unexpected error');
        }
    });

    it("should use the storage strategy to store the workflow", async () => {
        const workflow = defineWorkflow({
            name: 'testWorkflow',
            steps,
            storageStrategy
        });
        await workflow.run();
        expect(storageStrategy.storeWorkflow).toHaveBeenCalled();
        expect(storageStrategy.updateWorkflowStatus).toHaveBeenCalled();
        expect(storageStrategy.storeStep).toHaveBeenCalledTimes(2);
        expect(storageStrategy.updateStepStatus).toHaveBeenCalledTimes(2);
    });

    it('should rollback and return the step error', async () => {
        const failingStep = defineStep({
            name: 'failingStep',
            run: async () => errorResult('step failed'),
        });
        const workflow = defineWorkflow({
            name: 'testWorkflow',
            steps: [...steps, failingStep],
            storageStrategy
        });
        const result = await workflow.run();
        if (result.isErr) {
            expect(result.error).toEqual({
                failedStep: 'failingStep',
                error: 'step failed',
                id: 'workflowId'
            });
            expect(steps[1].rollback).toHaveBeenCalled();
        } else {
            throw new Error('Unexpected success');
        }
    });

    it('should catch errors in a step and return an error result', async () => {
        const failingStep = defineStep({
            name: 'failingStep',
            run: async () => {
                throw new Error('step failed');
            },
        });
        const workflow = defineWorkflow({
            name: 'testWorkflow',
            steps: [...steps, failingStep],
            storageStrategy
        });
        const result = await workflow.run();
        if (result.isErr) {
            expect(result.error.error).toBeInstanceOf(Error);
            expect((result.error.error as Error).message).toBe('step failed');
            expect(result.error.failedStep).toBe('failingStep');
        } else {
            throw new Error('Unexpected success');
        }
    });

});