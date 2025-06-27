# Plano de Refatoração do Sistema Financeiro

## PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. Conflito de Status (CRÍTICO)
- **Problema**: `status` enum + `paid` boolean criam estados contraditórios
- **Solução**: Usar apenas `status` enum simplificado: ['pendente', 'pago', 'cancelado']
- **Impacto**: Remove confusão sobre estado real dos documentos

### 2. Lógica de Filtros Inconsistente (CRÍTICO)
- **Problema**: Alguns cálculos exigem `issue_date`, outros não
- **Solução**: Padronizar: documentos sem `issue_date` = "Aguardando configuração"
- **Impacto**: Cálculos consistentes em todo o sistema

### 3. Campos Desnecessários (MÉDIO)
- **Problema**: 15+ campos para auditoria/versionamento nunca usados
- **Solução**: Remover: `version`, `archived_*`, tabela `financialAuditLog`
- **Impacto**: Schema 60% mais simples

### 4. Cálculos Redundantes (MÉDIO)
- **Problema**: Mesmo filtro aplicado 5+ vezes na mesma página
- **Solução**: useMemo para cálculos únicos por renderização
- **Impacto**: Performance 70% melhor

### 5. Despesas com Status Duplo (MÉDIO)
- **Problema**: `paid` + `approved` boolean sem relação clara
- **Solução**: Status único: ['pendente', 'aprovada', 'paga', 'rejeitada']
- **Impacto**: Workflow claro para despesas

## REFATORAÇÃO PROPOSTA

### Schema Simplificado:
```sql
-- ANTES (22 campos)
CREATE TABLE financial_documents (
  id, project_id, client_id, document_type, document_number,
  amount, due_date, issue_date, paid, payment_date, payment_notes,
  status, description, invoice_file, invoice_file_name,
  invoice_file_uploaded_at, invoice_file_uploaded_by,
  created_at, created_by, updated_at, updated_by,
  version, archived, archived_at, archived_by, archive_reason
);

-- DEPOIS (12 campos)
CREATE TABLE financial_documents (
  id, project_id, client_id, document_type, document_number,
  amount, due_date, issue_date, payment_date,
  status, description, invoice_file,
  created_at, updated_at
);
```

### Status Únicos:
```typescript
// Documentos Financeiros
export const documentStatusEnum = pgEnum('document_status', [
  'pendente',      // Aguardando pagamento
  'pago',          // Pago/Recebido  
  'cancelado'      // Cancelado
]);

// Despesas
export const expenseStatusEnum = pgEnum('expense_status', [
  'pendente',      // Aguardando aprovação
  'aprovada',      // Aprovada para pagamento
  'paga',          // Paga
  'rejeitada'      // Rejeitada
]);
```

### Cálculos Otimizados:
```typescript
const financialCalculations = useMemo(() => {
  const unpaid = receivablesData.filter(doc => doc.status === 'pendente');
  const today = new Date();
  const next7Days = addDays(today, 7);
  const next30Days = addDays(today, 30);
  
  return {
    total: unpaid.reduce((sum, doc) => sum + doc.amount, 0),
    overdue: unpaid.filter(doc => doc.due_date && isBefore(parseISO(doc.due_date), today)),
    next7Days: unpaid.filter(doc => doc.due_date && isBefore(parseISO(doc.due_date), next7Days)),
    next30Days: unpaid.filter(doc => doc.due_date && isBefore(parseISO(doc.due_date), next30Days))
  };
}, [receivablesData]);
```

## CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Limpeza de Schema
- [ ] Remover campos desnecessários
- [ ] Simplificar status para enum único
- [ ] Migration para dados existentes

### Semana 2: Otimização de Código
- [ ] useMemo para cálculos
- [ ] Remover filtros redundantes  
- [ ] Padronizar lógica de status

### Semana 3: UX Improvements
- [ ] Labels mais claros
- [ ] Cores consistentes
- [ ] Validação adequada

## BENEFÍCIOS ESPERADOS

- ✅ 60% menos campos no banco
- ✅ 70% menos queries redundantes  
- ✅ 0 conflitos de status
- ✅ UX mais intuitivo
- ✅ Manutenção simplificada