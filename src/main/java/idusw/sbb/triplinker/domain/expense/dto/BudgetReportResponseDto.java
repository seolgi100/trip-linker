package idusw.sbb.triplinker.domain.expense.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class BudgetReportResponseDto {
    private Long totalEstimatedAmount; //전체 예상 총액
    private Long totalActualAmount;    //전체 실제 총액
    private List<CategoryBudgetDto> categoryBudgets; //카테고리별 통계 리스트

    //카테고리별 통계용 데이터
    @Getter
    @Builder
    public static class CategoryBudgetDto {
        private String category;
        private Long estimatedAmount;
        private Long actualAmount;

        //데이터 병합용 메서드
        public void addEstimated(Long amount) { this.estimatedAmount += amount; }
        public void addActual(Long amount) { this.actualAmount += amount; }
    }
}