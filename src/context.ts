import {ContextTypeNotDefinedError} from "./error/context-type-errors";

type ContextType<T> = Record<string, any> & T;

function createContext<T>(): ContextType<T> {
    return {} as ContextType<T>
}


class WorkflowContext {
    private readonly data: Map<unknown, unknown> = new Map()

    public get<T>(type: ContextType<T>) {
        const value = this.data.get(type)
        return value as T ?? undefined
    }

    public getOrThrow<T>(type: ContextType<T>) {
        const value = this.data.get(type)
        if (!value) {
            throw new ContextTypeNotDefinedError(`${type} is not defined in this context`)
        }
        return value as T
    }

    public set<T>(type: ContextType<T>, value: T) {
        this.data.set(type, value)
    }
}


export {WorkflowContext, createContext}


