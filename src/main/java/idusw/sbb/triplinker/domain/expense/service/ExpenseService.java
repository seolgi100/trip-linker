package idusw.sbb.triplinker.domain.expense.service;

import idusw.sbb.triplinker.domain.expense.dto.BudgetReportResponseDto;
import idusw.sbb.triplinker.domain.expense.dto.BudgetReportResponseDto.CategoryBudgetDto;
import idusw.sbb.triplinker.domain.expense.entity.Expense;
import idusw.sbb.triplinker.domain.expense.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExpenseService {
    private final ExpenseRepository expenseRepository;

    public BudgetReportResponseDto getBudgetReport(Long planId) {

        List<Expense> expenses = expenseRepository.findByPlanId(planId);

        long totalEst = 0L;
        long totalAct = 0L;
        Map<String, CategoryBudgetDto> categoryMap = new HashMap<>();

        for (Expense expense : expenses) {
            String category = expense.getCategory();
            long amount = expense.getAmount();

            //Map 초기화
            categoryMap.putIfAbsent(category, CategoryBudgetDto.builder()
                    .category(category)
                    .estimatedAmount(0L)
                    .actualAmount(0L)
                    .build());

            CategoryBudgetDto categoryDto = categoryMap.get(category);

            //예상 비용 / 실제 지출 분기 처리
            if (expense.isEstimated()) {
                categoryDto.addEstimated(amount);
                totalEst += amount;
            } else {
                categoryDto.addActual(amount);
                totalAct += amount;
            }
        }

        return BudgetReportResponseDto.builder()
                .totalEstimatedAmount(totalEst)
                .totalActualAmount(totalAct)
                .categoryBudgets(new ArrayList<>(categoryMap.values()))
                .build();
    }
}
