# ts-workflow
Define safe workflows in TypeScript with ease.


## Installation
```bash
npm install ts-workflow
```

## Usage

### Defining a step
Define your workflow steps using the `defineStep` helper function.


```typescript
import {defineStep} from 'ts-workflow';

const myStep = defineStep({
    name: 'myStep',
    run: async (ctx) => {
        console.log('Hello, World!');
    },
    rollback: async (ctx) => {
        console.log('Rolling back step');
    }
});
```
### Defining a workflow
After defining a step, you can create a workflow with the `defineWorkflow` helper.

```typescript
import {defineWorkflow} from 'ts-workflow';
import {myStep} from "./myStep";

const myWorkflow = defineWorkflow({
    steps: [myStep],
    name: 'myWorkflow'
});
```

### Running your workflow
You can run your workflow by calling the `run` method on the workflow instance.
This produces a promise that resolves to a `Result`

```typescript
const workflowResult = await myWorkflow.run();
if (workflowResult.isOk) {
    console.log('Workflow ran successfully');
} else {
    console.log('Workflow failed', workflowResult.error);
}
```

### Passing initial data to your workflow
The workflow's initial data is handled in its **context**. You can setup this context by defining a `setupContext` function, which arguments must be passed in the run method of the workflow

```typescript
import {defineWorkflow, createContext} from 'ts-workflow';

const nameContext = createContext<string>();

const myWorkflow = defineWorkflow({
    steps: [myStep],
    name: 'myWorkflow',
    setupContext: (name: string, ctx) => {
        ctx.set(nameContext, name);
    }
});

const workflowResult = await myWorkflow.run('Hello, World!');

```

### Implementing a storage strategy for database-backing your workflow
You can provide a `StorageStrategy` to your workflow to persist the state of your workflow.

// In progress


