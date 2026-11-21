import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as txApi from '../api/transactions';
import * as budgetApi from '../api/budgets';
import * as bucketApi from '../api/buckets';
import * as goalApi from '../api/goals';
import * as ruleApi from '../api/rules';
import * as catApi from '../api/categories';
import * as peopleApi from '../api/people';
import * as accountApi from '../api/accounts';
import * as alertApi from '../api/alerts';
import * as digestApi from '../api/digests';
import * as planApi from '../api/plan';
import { getCurrentMonth } from '../utils/dates';

export const queryKeys = {
  transactions: ['transactions'],
  transactionList: (limit, offset) => ['transactions', { limit, offset }],
  transactionWindow: (params) => ['transactions', params],
  accounts: ['accounts'],
  people: ['people'],
  budgets: ['budgets'],
  buckets: ['buckets'],
  goals: ['goals'],
  rules: ['rules'],
  categories: ['categories'],
  actuals: ['actuals'],
  actualsForMonth: (month) => ['actuals', month ?? 'current'],
  alerts: ['alerts'],
  digests: ['digests'],
  digestList: (limit) => ['digests', { limit }],
  assumptions: ['assumptions'],
  projections: ['projections'],
  projection: (months, start) => ['projections', { months, start }],
};

export const mutationInvalidations = {
  budgetSave: ['budgets', 'categories', 'actuals', 'alerts'],
  budgetDelete: ['budgets', 'categories', 'actuals', 'alerts'],
  categoryChange: [
    'categories',
    'transactions',
    'rules',
    'budgets',
    'actuals',
    'alerts',
    'digests',
  ],
  planChange: [
    'assumptions',
    'buckets',
    'categories',
    'projections',
    'goals',
    'actuals',
    'alerts',
    'digests',
  ],
  bucketCreate: ['buckets', 'goals'],
  bucketDelete: [
    'buckets',
    'assumptions',
    'projections',
    'goals',
    'alerts',
    'actuals',
  ],
  goalChange: ['goals', 'projections', 'alerts'],
  ruleChange: ['rules', 'categories'],
  rulesApply: ['rules', 'categories', 'transactions', 'actuals', 'alerts'],
  categoryCreate: [
    'categories',
    'budgets',
    'rules',
    'transactions',
    'actuals',
    'alerts',
  ],
  alertDismiss: ['alerts'],
  digestChange: ['digests', 'alerts'],
  csvImport: ['transactions', 'actuals', 'alerts', 'digests'],
  transactionChange: [
    'transactions',
    'people',
    'categories',
    'actuals',
    'alerts',
    'digests',
  ],
  accountChange: ['accounts', 'transactions'],
  peopleChange: [
    'people',
    'transactions',
    'actuals',
    'alerts',
    'digests',
    'accounts',
    'rules',
    'categories',
  ],
};

function invalidateGroups(queryClient, groups) {
  return Promise.all(
    groups.map((group) => queryClient.invalidateQueries({ queryKey: queryKeys[group] }))
  );
}

// Queries
export function useTransactions(limit = 20, offset = 0) {
  return useQuery({
    queryKey: queryKeys.transactionList(limit, offset),
    queryFn: () => txApi.getTransactions({ limit, offset }),
  });
}

export function useTransactionWindow(params) {
  return useQuery({
    queryKey: queryKeys.transactionWindow(params),
    queryFn: () => txApi.getTransactions(params),
  });
}

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: accountApi.getAccounts });
}

export function usePeople() {
  return useQuery({ queryKey: queryKeys.people, queryFn: peopleApi.getPeople });
}

export function useBudgets() {
  return useQuery({ queryKey: queryKeys.budgets, queryFn: budgetApi.getBudgets });
}

export function useBuckets() {
  return useQuery({ queryKey: queryKeys.buckets, queryFn: bucketApi.getBuckets });
}

export function useGoals() {
  return useQuery({ queryKey: queryKeys.goals, queryFn: goalApi.getGoals });
}

export function useRules() {
  return useQuery({ queryKey: queryKeys.rules, queryFn: ruleApi.getRules });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: catApi.getCategories });
}

export function useActuals(month, enabled = true) {
  return useQuery({
    queryKey: queryKeys.actualsForMonth(month),
    queryFn: () => txApi.getActuals(month ?? undefined),
    enabled,
  });
}

export function useAlerts() {
  return useQuery({ queryKey: queryKeys.alerts, queryFn: alertApi.getAlerts });
}

export function useDigests(limit = 8) {
  return useQuery({
    queryKey: queryKeys.digestList(limit),
    queryFn: () => digestApi.getDigests(limit),
  });
}

export function useAssumptions() {
  return useQuery({ queryKey: queryKeys.assumptions, queryFn: planApi.getAssumptions });
}

export function useProjections(months = 12, startMonth = null) {
  const start = startMonth || getCurrentMonth();
  return useQuery({
    queryKey: queryKeys.projection(months, start),
    queryFn: () => planApi.getProjections(months, start),
  });
}

export function useCategoryImpact(name) {
  return useQuery({
    queryKey: ['category-impact', name],
    queryFn: () => catApi.getCategoryImpact(name),
    enabled: Boolean(name),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useRuleApplyPreview(pattern, category, scope) {
  return useQuery({
    queryKey: ['rule-apply-preview', pattern, category, scope],
    queryFn: () =>
      ruleApi.applyRules(scope, true, {
        merchant_pattern: pattern?.trim().toLowerCase(),
        category: category?.trim(),
      }),
    enabled: Boolean(pattern && category),
    retry: false,
    staleTime: 0,
    gcTime: 30000,
  });
}

// Mutations
export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: txApi.createTransaction,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.transactionChange),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => txApi.updateTransaction(id, patch),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.transactionChange),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: txApi.deleteTransaction,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.transactionChange),
  });
}

export function useUndoDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: txApi.undoDeleteTransaction,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.transactionChange),
  });
}

export function useParseTransactionText() {
  return useMutation({
    mutationFn: txApi.parseTransactionText,
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, monthlyLimit }) =>
      budgetApi.saveBudget(category, monthlyLimit),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.budgetSave),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: budgetApi.deleteBudget,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.budgetDelete),
  });
}

export function useCreateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bucketApi.createBucket,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.bucketCreate),
  });
}

export function useDeleteBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bucketApi.deleteBucket,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.bucketDelete),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalApi.createGoal,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.goalChange),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalApi.deleteGoal,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.goalChange),
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ruleApi.createRule,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.ruleChange),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => ruleApi.updateRule(id, input),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.ruleChange),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ruleApi.deleteRule,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.ruleChange),
  });
}

export function useApplyRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, only }) => ruleApi.applyRules(scope, false, only),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.rulesApply),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: catApi.createCategory,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.categoryCreate),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, newName, merge }) =>
      catApi.updateCategory(name, newName, merge),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.categoryChange),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, reassignTo }) => catApi.deleteCategory(name, reassignTo),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.categoryChange),
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: peopleApi.createPerson,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.peopleChange),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, patch }) => peopleApi.updatePerson(name, patch),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.peopleChange),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, confirm }) => peopleApi.deletePerson(name, confirm),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.peopleChange),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: accountApi.createAccount,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.accountChange),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => accountApi.updateAccount(id, patch),
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.accountChange),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: accountApi.deleteAccount,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.accountChange),
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: alertApi.dismissAlert,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.alertDismiss),
  });
}

export function useGenerateDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: digestApi.generateDigest,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.digestChange),
  });
}

export function useMarkDigestRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: digestApi.markDigestRead,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.digestChange),
  });
}

export function useSavePlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, input, raise }) => {
      const saved = key ? await planApi.updatePlanItem(key, input) : await planApi.createPlanItem(input);
      if (raise) {
        if (raise.kind === 'set') {
          await planApi.setYearlyRaise(saved.key, raise.body);
        } else if (raise.kind === 'clear') {
          await planApi.clearYearlyRaise(saved.key);
        }
      }
      return saved;
    },
    onSettled: () => invalidateGroups(qc, mutationInvalidations.planChange),
  });
}

export function useDeletePlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planApi.deletePlanItem,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.planChange),
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planApi.importCsv,
    onSuccess: () => invalidateGroups(qc, mutationInvalidations.csvImport),
  });
}
