import {beforeEach, describe, expect, it} from 'vitest';
import {createContext, WorkflowContext} from '../src/context';
import {ContextTypeNotDefinedError} from '../src/error/context-type-errors';

describe('WorkflowContext', () => {
    let context: WorkflowContext;

    beforeEach(() => {
        context = new WorkflowContext();
    });

    it('should set and get a value', () => {
        const type = createContext<string>();
        const value = 'testValue';
        context.set(type, value);
        const result = context.get(type);
        expect(result).toBe(value);
    });

    it('should return undefined for a non-existent type', () => {
        const type = createContext<string>()
        const result = context.get(type);
        expect(result).toBeUndefined();
    });

    it('should throw an error when getting a non-existent type with getOrThrow', () => {
        const type = createContext<string>();
        expect(() => context.getOrThrow(type)).toThrow(ContextTypeNotDefinedError);
    });

    it('should get a value with getOrThrow', () => {
        const type = createContext<string>();
        const value = 'testValue';
        context.set(type, value);
        const result = context.getOrThrow(type);
        expect(result).toBe(value);
    });
});