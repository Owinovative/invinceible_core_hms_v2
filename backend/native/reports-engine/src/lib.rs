use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct MoneyLine {
    pub amount: i64,
    pub cost: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct MoneySummary {
    pub gross: i64,
    pub cost: i64,
    pub profit: i64,
    pub line_count: usize,
}

pub fn summarize_money_lines(lines: &[MoneyLine]) -> MoneySummary {
    let mut gross = 0_i64;
    let mut cost = 0_i64;

    for line in lines {
        gross = gross.saturating_add(line.amount.max(0));
        cost = cost.saturating_add(line.cost.max(0));
    }

    MoneySummary {
        gross,
        cost,
        profit: gross.saturating_sub(cost),
        line_count: lines.len(),
    }
}
pub fn duplicate_patient_score(name_a: &str, name_b: &str, phone_match: bool) -> u8 {
    let normalize = |value: &str| {
        value
            .to_lowercase()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    };

    let a = normalize(name_a);
    let b = normalize(name_b);
    let mut score = if a == b {
        70
    } else if !a.is_empty() && !b.is_empty() && (a.contains(&b) || b.contains(&a)) {
        45
    } else {
        0
    };

    if phone_match {
        score += 30;
    }

    score.min(100)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn summarizes_money_without_overflowing_negative_values() {
        let lines = vec![
            MoneyLine { amount: 10_000, cost: 6_000 },
            MoneyLine { amount: 5_000, cost: 3_500 },
            MoneyLine { amount: -100, cost: -50 },
        ];

        assert_eq!(
            summarize_money_lines(&lines),
            MoneySummary {
                gross: 15_000,
                cost: 9_500,
                profit: 5_500,
                line_count: 3,
            },
        );
    }

    #[test]
    fn scores_duplicate_patient_candidates() {
        assert_eq!(duplicate_patient_score("Anne Otieno", "anne   otieno", true), 100);
        assert_eq!(duplicate_patient_score("Anne Otieno", "Anne", false), 45);
        assert_eq!(duplicate_patient_score("Anne Otieno", "Brian", true), 30);
    }
}
