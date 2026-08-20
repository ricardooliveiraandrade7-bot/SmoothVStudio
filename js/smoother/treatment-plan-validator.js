// ==========================================
// SMOOTHVSTUDIO
// TREATMENT PLAN VALIDATOR
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Validar a coerência entre:
//
// Analyzer / Measurement
//        ↓
// SpectralProfile
//        ↓
// Diagnostic Observer
//        ↓
// Treatment Bridge
//        ↓
// VocalTreatmentPlan
//        ↓
// TreatmentPlanValidator
//
// IMPORTANTE:
//
// Este módulo NÃO:
//
// - modifica áudio
// - aplica EQ
// - cria filtros
// - altera ganho
// - executa DSP
// - altera o Treatment Plan
// - libera autoridade DSP
//
// Ele apenas responde:
//
// "O plano produzido é coerente com
// as evidências disponíveis?"
//
// ==========================================


class TreatmentPlanValidator {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // LIMITES
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.60;


        this.minimumRegionalConfidence =
            options.minimumRegionalConfidence ??
            0.55;


        this.minimumRegionalCoverage =
            options.minimumRegionalCoverage ??
            0.50;


        this.maxBoostDb =
            options.maxBoostDb ??
            2.0;


        this.maxCutDb =
            options.maxCutDb ??
            -2.5;


        // ==================================
        // AUTORIDADE
        // ==================================
        //
        // O Validator nunca concede
        // autoridade DSP.
        //

        this.processingPermission =
            "none";
    }


    // ======================================
    // CLAMP
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // NÚMERO SEGURO
    // ======================================

    safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(value);


        return Number.isFinite(number)
            ? number
            : fallback;
    }


    // ======================================
    // RESULTADO DE REGRA
    // ======================================

    rule(
        id,
        passed,
        severity,
        message
    ) {

        return {

            id,

            passed:
                passed === true,

            severity,

            message
        };
    }


    // ======================================
    // VALIDAR ESTRUTURA
    // ======================================

    validateStructure(
        plan
    ) {

        const rules = [];


        rules.push(
            this.rule(
                "plan-exists",
                !!plan &&
                typeof plan ===
                    "object",
                "error",
                "Treatment Plan inexistente ou inválido."
            )
        );


        rules.push(
            this.rule(
                "regions-exist",
                !!(
                    plan &&
                    plan.regions &&
                    typeof plan.regions ===
                        "object"
                ),
                "error",
                "O Treatment Plan não possui regiões válidas."
            )
        );


        rules.push(
            this.rule(
                "safety-exists",
                !!(
                    plan &&
                    plan.safety &&
                    typeof plan.safety ===
                        "object"
                ),
                "error",
                "O Treatment Plan não possui bloco de segurança."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR SEGURANÇA DSP
    // ======================================

    validateSafety(
        plan
    ) {

        const rules = [];


        if (
            !plan ||
            !plan.safety
        ) {

            return [
                this.rule(
                    "safety-block",
                    false,
                    "error",
                    "Bloco de segurança ausente."
                )
            ];
        }


        const safety =
            plan.safety;


        rules.push(
            this.rule(
                "processing-permission-locked",
                safety.processingPermission ===
                    "none",
                "error",
                "A autoridade de processamento deve permanecer bloqueada nesta etapa."
            )
        );


        rules.push(
            this.rule(
                "audio-processing-disabled",
                safety.audioProcessing ===
                    false,
                "error",
                "O Validator detectou autoridade de processamento de áudio."
            )
        );


        rules.push(
            this.rule(
                "filter-generation-disabled",
                safety.filterGeneration ===
                    false,
                "error",
                "A geração de filtros deve permanecer desativada."
            )
        );


        rules.push(
            this.rule(
                "gain-generation-disabled",
                safety.gainGeneration ===
                    false,
                "error",
                "A geração de ganho deve permanecer desativada."
            )
        );


        rules.push(
            this.rule(
                "reconstruction-disabled",
                safety.reconstruction ===
                    false,
                "error",
                "A reconstrução deve permanecer desativada."
            )
        );


        rules.push(
            this.rule(
                "planning-only",
                safety.planningOnly ===
                    true,
                "error",
                "O Treatment Plan deve permanecer somente planejamento."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR CONTEXTO ESPECTRAL
    // ======================================

    validateSpectralContext(
        plan
    ) {

        const rules = [];


        if (
            !plan ||
            !plan.spectralContext
        ) {

            return [
                this.rule(
                    "spectral-context-exists",
                    false,
                    "warning",
                    "Contexto espectral não disponível."
                )
            ];
        }


        const context =
            plan.spectralContext;


        const spectral =
            context.spectral ||
            {};


        const diagnostic =
            context.diagnostic ||
            {};


        rules.push(
            this.rule(
                "spectral-confidence-valid",
                this.safeNumber(
                    spectral.confidence
                ) >= 0,
                "error",
                "Confiança espectral inválida."
            )
        );


        rules.push(
            this.rule(
                "diagnostic-confidence-valid",
                this.safeNumber(
                    diagnostic.confidence
                ) >= 0,
                "error",
                "Confiança diagnóstica inválida."
            )
        );


        rules.push(
            this.rule(
                "regional-coverage-valid",
                this.safeNumber(
                    diagnostic.regionalCoverage
                ) >= 0 &&
                this.safeNumber(
                    diagnostic.regionalCoverage
                ) <= 1,
                "error",
                "Cobertura regional inválida."
            )
        );


        rules.push(
            this.rule(
                "diagnostic-conflicts",
                diagnostic.conflicts !==
                    true,
                "warning",
                "Existem conflitos diagnósticos."
            )
        );


        rules.push(
            this.rule(
                "uncertain-ratio",
                this.safeNumber(
                    diagnostic.uncertainRatio
                ) >= 0 &&
                this.safeNumber(
                    diagnostic.uncertainRatio
                ) <= 1,
                "error",
                "Taxa de incerteza inválida."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR UMA REGIÃO
    // ======================================

    validateRegion(
        regionName,
        decision,
        context
    ) {

        const rules = [];


        if (
            !decision ||
            typeof decision !==
                "object"
        ) {

            return [
                this.rule(
                    `${regionName}-decision-exists`,
                    false,
                    "error",
                    `Decisão ausente para a região ${regionName}.`
                )
            ];
        }


        const state =
            decision.state ||
            "preserve";


        const targetDb =
            this.safeNumber(
                decision.targetDb
            );


        const confidence =
            this.clamp(
                this.safeNumber(
                    decision.confidence
                ),
                0,
                1
            );


        const regionalState =
            decision.regionalState ||
            "unavailable";


        const regionalConfidence =
            this.clamp(
                this.safeNumber(
                    decision.regionalConfidence
                ),
                0,
                1
            );


        const contextAvailable =
            !!(
                context &&
                context.available
            );


        const diagnostic =
            context &&
            context.diagnostic
                ? context.diagnostic
                : null;


        // ==================================
        // REGRA 1
        // ==================================

        rules.push(
            this.rule(
                `${regionName}-confidence-valid`,
                confidence >= 0 &&
                confidence <= 1,
                "error",
                `Confiança inválida em ${regionName}.`
            )
        );


        // ==================================
        // REGRA 2
        // ==================================
        //
        // targetDb nunca pode ultrapassar
        // os limites definidos.
        //

        const targetInsideLimits =
            targetDb <=
                this.maxBoostDb &&
            targetDb >=
                this.maxCutDb;


        rules.push(
            this.rule(
                `${regionName}-target-within-limits`,
                targetInsideLimits,
                "error",
                `TargetDb fora dos limites seguros em ${regionName}.`
            )
        );


        // ==================================
        // REGRA 3
        // ==================================
        //
        // Estado preserve deve ter targetDb
        // zero.
        //

        if (
            state ===
            "preserve"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-preserve-zero-target`,
                    targetDb === 0,
                    "warning",
                    `Região ${regionName} marcada como preserve possui targetDb diferente de zero.`
                )
            );
        }


        // ==================================
        // REGRA 4
        // ==================================
        //
        // Reconstrução não pode aparecer
        // sem autorização.
        //

        if (
            decision.reconstruction ===
            true
        ) {

            const reconstructionAllowed =
                !!(
                    context &&
                    context.safety &&
                    context.safety.reconstruction ===
                        true
                );


            rules.push(
                this.rule(
                    `${regionName}-reconstruction-authority`,
                    reconstructionAllowed,
                    "error",
                    `Reconstrução detectada em ${regionName} sem autoridade correspondente.`
                )
            );
        }


        // ==================================
        // REGRA 5
        // ==================================
        //
        // Região natural deve ser preservada.
        //

        if (
            regionalState ===
            "natural"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-natural-preserved`,
                    state ===
                        "preserve" &&
                    targetDb ===
                        0,
                    "error",
                    `A região natural ${regionName} recebeu tratamento.`
                )
            );
        }


        // ==================================
        // REGRA 6
        // ==================================
        //
        // Região uncertain não deve gerar
        // tratamento.
        //

        if (
            regionalState ===
            "uncertain"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-uncertain-preserved`,
                    state ===
                        "preserve" &&
                    targetDb ===
                        0,
                    "error",
                    `A região incerta ${regionName} recebeu tratamento.`
                )
            );
        }


        // ==================================
        // REGRA 7
        // ==================================
        //
        // Região unstable também deve cair
        // para preservação.
        //

        if (
            regionalState ===
            "unstable"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-unstable-preserved`,
                    state ===
                        "preserve" &&
                    targetDb ===
                        0,
                    "error",
                    `A região instável ${regionName} recebeu tratamento.`
                )
            );
        }


        // ==================================
        // REGRA 8
        // ==================================
        //
        // Masked NÃO equivale automaticamente
        // a recessed.
        //

        if (
            regionalState ===
            "masked"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-masked-not-treated`,
                    state ===
                        "preserve" &&
                    targetDb ===
                        0,
                    "error",
                    `A região mascarada ${regionName} foi interpretada como ordem de tratamento.`
                )
            );
        }


        // ==================================
        // REGRA 9
        // ==================================
        //
        // Tratamento regional precisa de
        // confiança mínima.
        //

        if (
            state !==
                "preserve"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-treatment-confidence`,
                    confidence >=
                        this.minimumConfidence,
                    "warning",
                    `Tratamento em ${regionName} possui confiança insuficiente.`
                )
            );
        }


        // ==================================
        // REGRA 10
        // ==================================
        //
        // Se existe contexto regional real,
        // a confiança também precisa ser
        // suficiente.
        //

        if (
            contextAvailable &&
            decision.contextApplied ===
                true &&
            regionalState !==
                "unavailable" &&
            state !==
                "preserve"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-regional-confidence`,
                    regionalConfidence >=
                        this.minimumRegionalConfidence,
                    "warning",
                    `Evidência regional insuficiente para ${regionName}.`
                )
            );
        }


        // ==================================
        // REGRA 11
        // ==================================
        //
        // Conflito global invalida tratamento.
        //

        if (
            diagnostic &&
            diagnostic.conflicts ===
                true &&
            state !==
                "preserve"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-conflict-fallback`,
                    false,
                    "error",
                    `A região ${regionName} recebeu tratamento apesar de conflito diagnóstico global.`
                )
            );
        }


        // ==================================
        // REGRA 12
        // ==================================
        //
        // Cobertura regional insuficiente
        // não deve gerar nova autoridade.
        //

        if (
            contextAvailable &&
            diagnostic &&
            this.safeNumber(
                diagnostic.regionalCoverage
            ) <
                this.minimumRegionalCoverage &&
            state !==
                "preserve"
        ) {

            rules.push(
                this.rule(
                    `${regionName}-coverage-sufficient`,
                    false,
                    "warning",
                    `Cobertura regional insuficiente para sustentar tratamento em ${regionName}.`
                )
            );
        }


        return rules;
    }


    // ======================================
    // VALIDAR TODAS AS REGIÕES
    // ======================================

    validateRegions(
        plan
    ) {

        const rules = [];


        if (
            !plan ||
            !plan.regions
        ) {

            return [
                this.rule(
                    "regions-block",
                    false,
                    "error",
                    "Regiões ausentes."
                )
            ];
        }


        const context =
            plan.spectralContext ||
            null;


        const regionNames =
            Object.keys(
                plan.regions
            );


        for (
            let i = 0;
            i < regionNames.length;
            i++
        ) {

            const regionName =
                regionNames[i];


            const regionRules =
                this.validateRegion(
                    regionName,
                    plan.regions[
                        regionName
                    ],
                    context
                );


            for (
                let j = 0;
                j < regionRules.length;
                j++
            ) {

                rules.push(
                    regionRules[j]
                );
            }
        }


        return rules;
    }


    // ======================================
    // VALIDAR POLÍTICA
    // ======================================

    validateDecisionPolicy(
        plan
    ) {

        const rules = [];


        const policy =
            plan &&
            plan.spectralContext &&
            plan.spectralContext
                .decisionPolicy;


        if (
            !policy
        ) {

            return [
                this.rule(
                    "decision-policy-exists",
                    false,
                    "warning",
                    "Política de decisão não encontrada."
                )
            ];
        }


        rules.push(
            this.rule(
                "analysis-only",
                policy.analysisOnly ===
                    true,
                "error",
                "O contexto deve permanecer em modo somente análise."
            )
        );


        rules.push(
            this.rule(
                "regional-evidence-required",
                policy.regionSpecificEvidenceRequired ===
                    true,
                "error",
                "Decisões regionais devem exigir evidência regional."
            )
        );


        rules.push(
            this.rule(
                "independent-evidence-required",
                policy.processingRequiresIndependentEvidence ===
                    true,
                "error",
                "Processamento futuro deve exigir evidência independente."
            )
        );


        rules.push(
            this.rule(
                "uncertain-fallback",
                policy.conflictingEvidenceFallsBackToUncertain ===
                    true,
                "error",
                "Conflitos devem retornar ao estado uncertain."
            )
        );


        rules.push(
            this.rule(
                "tonal-reference-not-preset",
                policy.tonalReferenceIsNotEqPreset ===
                    true,
                "error",
                "Referência tonal não pode ser tratada como preset de EQ."
            )
        );


        return rules;
    }


    // ======================================
    // COLETAR TODAS AS REGRAS
    // ======================================

    collectRules(
        plan
    ) {

        return [

            ...this.validateStructure(
                plan
            ),

            ...this.validateSafety(
                plan
            ),

            ...this.validateSpectralContext(
                plan
            ),

            ...this.validateDecisionPolicy(
                plan
            ),

            ...this.validateRegions(
                plan
            )
        ];
    }


    // ======================================
    // RESUMO DAS REGRAS
    // ======================================

    summarizeRules(
        rules
    ) {

        const summary = {

            total:
                rules.length,

            passed:
                0,

            failed:
                0,

            errors:
                0,

            warnings:
                0
        };


        for (
            let i = 0;
            i < rules.length;
            i++
        ) {

            const rule =
                rules[i];


            if (
                rule.passed
            ) {

                summary.passed++;

            } else {

                summary.failed++;
            }


            if (
                rule.severity ===
                "error" &&
                !rule.passed
            ) {

                summary.errors++;
            }


            if (
                rule.severity ===
                "warning" &&
                !rule.passed
            ) {

                summary.warnings++;
            }
        }


        return summary;
    }


    // ======================================
    // VALIDAR PLANO COMPLETO
    // ======================================

    validate(
        plan
    ) {

        const rules =
            this.collectRules(
                plan
            );


        const summary =
            this.summarizeRules(
                rules
            );


        const hasErrors =
            summary.errors >
            0;


        const hasWarnings =
            summary.warnings >
            0;


        /*
         * Um plano só é considerado
         * estruturalmente seguro quando
         * não possui erros.
         *
         * Warnings não quebram o fluxo,
         * mas precisam ser registrados.
         */

        const valid =
            !hasErrors;


        const safeForFutureDecision =
            valid &&
            !hasWarnings;


        /*
         * IMPORTANTÍSSIMO:
         *
         * O Validator NÃO libera DSP
         * mesmo quando tudo está perfeito.
         */

        return {

            version:
                this.version,

            valid,

            safeForFutureDecision,

            processingPermission:
                "none",

            audioProcessing:
                false,

            rules,

            summary,

            authority:
                "validation-only",

            recommendation:
                hasErrors
                    ? "fallback-to-observe"
                    : hasWarnings
                        ? "review-before-decision"
                        : "coherent-analysis-plan"
        };
    }


    // ======================================
    // VERIFICAR SE PODE CONTINUAR
    // ======================================
    //
    // Isto NÃO significa:
    //
    // "pode processar".
    //
    // Significa somente:
    //
    // "o próximo estágio pode analisar
    // este plano sem detectar contradição."
    //
    // ======================================

    canAdvanceToNextAnalysisStage(
        validation
    ) {

        if (
            !validation
        ) {

            return false;
        }


        return (
            validation.valid ===
                true &&
            validation.processingPermission ===
                "none" &&
            validation.audioProcessing ===
                false
        );
    }


    // ======================================
    // VERIFICAR AUTORIDADE DSP
    // ======================================
    //
    // Sempre retorna false nesta versão.
    //
    // A existência desta função cria uma
    // trava explícita para futuras camadas.
    //
    // ======================================

    canProcessAudio(
        validation
    ) {

        return false;
    }


    // ======================================
    // VERIFICAR RECONSTRUÇÃO
    // ======================================

    canReconstruct(
        validation
    ) {

        return false;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.TreatmentPlanValidator =
    TreatmentPlanValidator;