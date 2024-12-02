interface SuccessResult<T> {
    status: 'success';
    data: T;
    isOk: true;
    isErr: false;
}

interface ErrorResult<E = string> {
    status: 'error';
    error: E;
    isOk: false;
    isErr: true;
}

type Result<T = unknown, E = unknown> = SuccessResult<T> | ErrorResult<E>


/**
 * Helper for returning a successful result
 */
function successResult<T>(data: T): SuccessResult<T> {
    return {
        status: 'success',
        data,
        isOk: true,
        isErr: false
    };
}

/**
 * Helper for returning an error result
 */
function errorResult<E>(error: E): ErrorResult<E> {
    return {
        status: 'error',
        error,
        isOk: false,
        isErr: true
    };
}

export {Result, successResult, errorResult, SuccessResult, ErrorResult}
