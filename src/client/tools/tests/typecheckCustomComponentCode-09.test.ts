import { describe, expect, test } from "vitest";
import { CustomComponentCodeTypescript } from "../typecheckCustomComponentCode";
import { backendResources } from "../../../backendResourcesImpl";

describe("customComponents prop", () => {
  test("component can access itself with customComponents", () => {
    expect(
      new CustomComponentCodeTypescript(backendResources, {
        MyComponent: "new customComponents.MyComponent(1, 2, 3)",
      }).typecheckComponent("MyComponent"),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2554: Expected 2 arguments, but got 3.

1 new customComponents.MyComponent(1, 2, 3)
                                         ~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`);

    expect(
      new CustomComponentCodeTypescript(backendResources, {
        MyComponent: "new customComponents.MyComponent(1, 2)",
      }).typecheckComponent("MyComponent"),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.

1 new customComponents.MyComponent(1, 2)
                                   ~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`);

    expect(
      new CustomComponentCodeTypescript(backendResources, {
        MyComponent: 'new customComponents.MyComponent("1", 2)',
      }).typecheckComponent("MyComponent"),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'number[]'.

1 new customComponents.MyComponent("1", 2)
                                        ~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`);

    expect(
      new CustomComponentCodeTypescript(backendResources, {
        MyComponent: 'new customComponents.MyComponent("1", [2])',
      }).typecheckComponent("MyComponent"),
    ).toBeUndefined();
  });

  test("component cannot access undefined component", () => {
    expect(
      new CustomComponentCodeTypescript(backendResources, {
        MyComponent: 'new customComponents.UndefinedComponent("1", [2])',
      }).typecheckComponent("MyComponent"),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2339: Property 'UndefinedComponent' does not exist on type 'CustomComponents'.

1 new customComponents.UndefinedComponent("1", [2])
                       ~~~~~~~~~~~~~~~~~~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`);
  });

  test("component can access another component with customComponents", () => {
    const Component1 = `
      /**
       * @param {string} arg1
       * @param {number} arg2
       */
      function getAffectedCells(arg1, arg2) { return [arg2]; }
    `;

    expect(
      new CustomComponentCodeTypescript(backendResources, {
        Component1,
        Component2: 'new customComponents.Component1("1", "2", 3)',
      }).typecheckComponent("Component2"),
    ).toBeUndefined();

    expect(
      new CustomComponentCodeTypescript(backendResources, {
        Component1,
        Component2: 'new customComponents.Component1("1", 2, 3)',
      }).typecheckComponent("Component2"),
    ).toBe(`[WARNING] TypeScript found 1 problem(s) in the new component code. The change WAS applied.

line 1 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.

1 new customComponents.Component1("1", 2, 3)
                                       ~

The variables, classes and types this code can use are explained in docs topics \`custom-constraints:custom-components\` and \`custom-constraints:types-reference\`.`);
  });
});
