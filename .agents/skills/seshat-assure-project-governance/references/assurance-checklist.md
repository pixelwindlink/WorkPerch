# Assurance Checklist

1. Resolve the trusted Seshat Provider and target absolute path.
2. Review `seshat assure --review --json` before any write.
3. Confirm `gating.remediationAllowed`, `enablementBlocked`, `publicExposureBlocked` and `readinessBlocked` independently.
4. In apply mode confirm every operation path, precondition, authorization and route; preserve the operation journal.
5. Re-run assurance until the second pass is `no-changes` or only explicit Owner/outside routes remain.
6. Run `skills list`, `skills lint`, `skills review`, `audit`, `contracts review` and `verify` when diagnosing a non-converged result.
7. State whether forward evidence is passed, not-run or unsupported; never promote static alignment to automatic-trigger proof.
