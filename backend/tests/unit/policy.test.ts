import { describe, expect, it } from "vitest";
import { decideRefund } from "../../src/config/policy.js";

describe("decideRefund", () => {
  it("makes the full amount paid refundable on any cancellation or rejection", () => {
    expect(decideRefund({ advancePaid: 420 })).toEqual({ eligible: true, amount: 420 });
  });
});
