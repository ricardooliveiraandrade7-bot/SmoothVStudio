// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DECISION GATE
// V0.2
// ==========================================
//
// Responsabilidade:
//
// Determinar se existe evidência suficiente
// para transformar um Treatment Plan coerente
// em uma DECISÃO DE TRATAMENTO.
//
// Este módulo NÃO executa DSP.
//
// DECISION ALLOWED ≠ DSP ALLOWED
//
// ==========================================


class TreatmentDecisionGate {


    constructor(
        options = {}
    ) {

        this.version =
            "0.2";


        this.minimumDiagnosticConfidence =
            options.minimumDiagnosticConfidence ??
            0.60;


        this.minimumRegionalConfidence =
            options.minimumRegionalConfidence ??
            0.55;


        this.minimumRegionalCoverage =
            options.minimumRegionalCoverage ??
            0.50;


        this.blockedRegionalStates =
            new Set([
                "uncertain",
                "unstable",
                "masked"
            ]);


        this.preservedRegionalStates =
            new Set([
                "natural",
                "supported"
            ]);


        // HARD LOCK

        this.processingPermission =
            "none";


        this.decisionPermission =
            "none";
    }


    // ======================================
    // UTILITÁRIOS
    // ======================================


    safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


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


    isObject(
        value
    ) {

        return !!(
            value &&
            typeof value ===
                "object"
        );
    }


    // ======================================
    // EXTRAIR CONTEXTO DIAGNÓSTICO
    // ======================================


    getDiagnosticContext(
        plan
    ) {

        if (
            !this.isObject(
                plan
            )
        ) {

            return null;
        }


        if (
            this.isObject(
                plan.spectralContext
            )
        ) {

            return plan.spectralContext;
        }


        return null;
    }


    getDiagnostic(
        plan
    ) {

        const context =
            this.getDiagnosticContext(
                plan
            );


        if (
            context &&
            this.isObject(
                context.diagnostic
            )
        ) {

            return context.diagnostic;
        }


        return null;
    }


    getSafety(
        plan
    ) {

        if (
            this.isObject(
                plan &&
                plan.safety
            )
        ) {

            return plan.safety;
        }


        return null;
    }


    // ======================================
    // VALIDAR RESULTADO DO VALIDATOR
    // ======================================


    validateValidatorResult(
        validation
    ) {

        const rules = [];


        rules.push(
            this.rule(
                "validation-exists",
                this.isObject(
                    validation
                ),
                "error",
                "Resultado do Treatment Plan Validator ausente."
            )
        );


        if (
            !this.isObject(
                validation
            )
        ) {

            return rules;
        }


        rules.push(
            this.rule(
                "validation-is-valid",
                validation.valid ===
                    true,
                "error",
                "O Treatment Plan Validator não considerou o plano válido."
            )
        );


        rules.push(
            this.rule(
                "validation-processing-locked",
                validation.processingPermission ===
                    "none",
                "error",
                "O Validator não pode liberar processamento nesta etapa."
            )
        );


        rules.push(
            this.rule(
                "validation-no-audio-processing",
                validation.audioProcessing ===
                    false,
                "error",
                "O Validator indica autoridade de processamento de áudio."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR EVIDÊNCIA GLOBAL
    // ======================================


    validateGlobalEvidence(
        plan
    ) {

        const rules = [];


        const diagnostic =
            this.getDiagnostic(
                plan
            );


        if (
            !diagnostic
        ) {

            rules.push(
                this.rule(
                    "diagnostic-context-exists",
                    false,
                    "error",
                    "Não existe contexto diagnóstico suficiente para uma decisão."
                )
            );


            return rules;
        }


        const confidence =
            this.clamp(
                this.safeNumber(
                    diagnostic.confidence
                ),
                0,
                1
            );


        const coverage =
            this.clamp(
                this.safeNumber(
                    diagnostic.regionalCoverage
                ),
                0,
                1
            );


        rules.push(
            this.rule(
                "diagnostic-confidence",
                confidence >=
                    this.minimumDiagnosticConfidence,
                "error",
                "A confiança diagnóstica global é insuficiente para decisão."
            )
        );


        rules.push(
            this.rule(
                "regional-coverage",
                coverage >=
                    this.minimumRegionalCoverage,
                "warning",
                "A cobertura regional é insuficiente para sustentar decisões amplas."
            )
        );


        rules.push(
            this.rule(
                "diagnostic-no-conflicts",
                diagnostic.conflicts !==
                    true,
                "error",
                "Existem conflitos no diagnóstico."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR POLÍTICA
    // ======================================


    validatePolicy(
        plan
    ) {

        const rules = [];


        const context =
            this.getDiagnosticContext(
                plan
            );


        const policy =
            context &&
            this.isObject(
                context.decisionPolicy
            )
                ? context.decisionPolicy
                : null;


        // A política não é opcional.
        // Ela contém regras fundamentais
        // da arquitetura de decisão.

        if (
            !policy
        ) {

            rules.push(
                this.rule(
                    "decision-policy-exists",
                    false,
                    "error",
                    "Política explícita de decisão ausente."
                )
            );


            return rules;
        }


        rules.push(
            this.rule(
                "analysis-only",
                policy.analysisOnly ===
                    true,
                "error",
                "A política deve permanecer em modo somente análise."
            )
        );


        rules.push(
            this.rule(
                "regional-evidence-required",
                policy.regionSpecificEvidenceRequired ===
                    true,
                "error",
                "A decisão regional deve exigir evidência regional."
            )
        );


        rules.push(
            this.rule(
                "independent-evidence-required",
                policy.processingRequiresIndependentEvidence ===
                    true,
                "error",
                "O processamento futuro deve exigir evidência independente."
            )
        );


        rules.push(
            this.rule(
                "uncertain-fallback",
                policy.conflictingEvidenceFallsBackToUncertain ===
                    true,
                "error",
                "Conflitos devem retornar para uncertain."
            )
        );


        rules.push(
            this.rule(
                "tonal-reference-not-preset",
                policy.tonalReferenceIsNotEqPreset ===
                    true,
                "error",
                "Referências tonais não podem ser tratadas como presets fixos."
            )
        );


        return rules;
    }


    // ======================================
    // VALIDAR SEGURANÇA
    // ======================================


    validateSafety(
        plan
    ) {

        const rules = [];


        const safety =
            this.getSafety(
                plan
            );


        if (
            !safety
        ) {

            return [
                this.rule(
                    "safety-exists",
                    false,
                    "error",
                    "Bloco de segurança ausente."
                )
            ];
        }


        rules.push(
            this.rule(
                "processing-locked",
                safety.processingPermission ===
                    "none",
                "error",
                "O processamento DSP deve permanecer bloqueado."
            )
        );


        rules.push(
            this.rule(
                "audio-processing-disabled",
                safety.audioProcessing ===
                    false,
                "error",
                "Processamento de áudio detectado como habilitado."
            )
        );


        rules.push(
            this.rule(
                "filter-generation-disabled",
                safety.filterGeneration ===
                    false,
                "error",
                "Geração de filtros deve permanecer desabilitada."
            )
        );


        rules.push(
            this.rule(
                "gain-generation-disabled",
                safety.gainGeneration ===
                    false,
                "error",
                "Geração de ganho deve permanecer desabilitada."
            )
        );


        rules.push(
            this.rule(
                "reconstruction-disabled",
                safety.reconstruction ===
                    false,
                "error",
                "Reconstrução deve permanecer desabilitada."
            )
        );


        rules.push(
            this.rule(
                "planning-only",
                safety.planningOnly ===
                    true,
                "error",
                "O plano deve permanecer somente planejamento."
            )
        );


        return rules;
    }


    // ======================================
    // AVALIAR UMA REGIÃO
    // ======================================


    evaluateRegion(
        regionName,
        decision,
        plan
    ) {

        const result = {

            region:
                regionName,

            decisionPermission:
                "none",

            recommendedAction:
                "preserve",

            evidenceState:
                "unavailable",

            confidence:
                0,

            regionalConfidence:
                0,

            reasons:
                [],

            rules:
                []
        };


        if (
            !this.isObject(
                decision
            )
        ) {

            result.reasons.push(
                "decisão regional ausente"
            );


            result.rules.push(
                this.rule(
                    `${regionName}-decision-exists`,
                    false,
                    "error",
                    `Não existe decisão válida para ${regionName}.`
                )
            );


            return result;
        }


        const state =
            decision.regionalState ||
            "unavailable";


        const decisionState =
            decision.state ||
            "preserve";


        const confidence =
            this.clamp(
                this.safeNumber(
                    decision.confidence
                ),
                0,
                1
            );


        const regionalConfidence =
            this.clamp(
                this.safeNumber(
                    decision.regionalConfidence
                ),
                0,
                1
            );


        result.evidenceState =
            state;


        result.confidence =
            confidence;


        result.regionalConfidence =
            regionalConfidence;


        // ==================================
        // ESTADOS QUE DEVEM SER PRESERVADOS
        // ==================================


        if (
            this.blockedRegionalStates.has(
                state
            )
        ) {

            result.reasons.push(
                `estado regional ${state} não sustenta tratamento`
            );


            result.rules.push(
                this.rule(
                    `${regionName}-blocked-state`,
                    false,
                    "warning",
                    `A região ${regionName} está em estado ${state}.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        if (
            this.preservedRegionalStates.has(
                state
            )
        ) {

            result.reasons.push(
                `estado regional ${state} deve ser preservado`
            );


            result.rules.push(
                this.rule(
                    `${regionName}-preserved-state`,
                    decisionState ===
                        "preserve",
                    "error",
                    `A região ${regionName} está marcada como preservável.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        // ==================================
        // CONTEXTO
        // ==================================


        const context =
            this.getDiagnosticContext(
                plan
            );


        const diagnostic =
            this.getDiagnostic(
                plan
            );


        const policy =
            context &&
            this.isObject(
                context.decisionPolicy
            )
                ? context.decisionPolicy
                : null;


        const coverage =
            diagnostic
                ? this.clamp(
                    this.safeNumber(
                        diagnostic.regionalCoverage
                    ),
                    0,
                    1
                )
                : 0;


        const contextApplied =
            decision.contextApplied ===
                true;


        // ==================================
        // EVIDÊNCIA REGIONAL OBRIGATÓRIA
        // ==================================
        //
        // Se a política exige evidência
        // específica da região, não podemos
        // autorizar uma decisão regional
        // quando o contexto regional não
        // foi realmente aplicado.
        //


        if (
            policy &&
            policy.regionSpecificEvidenceRequired ===
                true &&
            !contextApplied
        ) {

            result.reasons.push(
                "evidência regional não aplicada"
            );


            result.rules.push(
                this.rule(
                    `${regionName}-regional-evidence-required`,
                    false,
                    "error",
                    `A região ${regionName} não possui evidência regional aplicada.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        // ==================================
        // CONFIANÇA GLOBAL
        // ==================================


        if (
            confidence <
                this.minimumDiagnosticConfidence
        ) {

            result.reasons.push(
                "confiança diagnóstica insuficiente"
            );


            result.rules.push(
                this.rule(
                    `${regionName}-global-confidence`,
                    false,
                    "warning",
                    `Confiança global insuficiente para ${regionName}.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        // ==================================
        // CONFIANÇA REGIONAL
        // ==================================


        if (
            contextApplied &&
            regionalConfidence <
                this.minimumRegionalConfidence
        ) {

            result.reasons.push(
                "confiança regional insuficiente"
            );


            result.rules.push(
                this.rule(
                    `${regionName}-regional-confidence`,
                    false,
                    "warning",
                    `Confiança regional insuficiente para ${regionName}.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        // ==================================
        // COBERTURA
        // ==================================


        if (
            contextApplied &&
            coverage <
                this.minimumRegionalCoverage
        ) {

            result.reasons.push(
                "cobertura regional insuficiente"
            );


            result.rules.push(
                this.rule(
                    `${regionName}-regional-coverage`,
                    false,
                    "warning",
                    `Cobertura regional insuficiente para ${regionName}.`
                )
            );


            result.recommendedAction =
                "preserve";


            return result;
        }


        // ==================================
        // PRESERVAÇÃO SOLICITADA
        // ==================================


        if (
            decisionState ===
                "preserve"
        ) {

            result.reasons.push(
                "o plano solicita preservação"
            );


            result.recommendedAction =
                "preserve";


            result.rules.push(
                this.rule(
                    `${regionName}-plan-preserve`,
                    true,
                    "info",
                    `A região ${regionName} permanece preservada.`
                )
            );


            return result;
        }


        // ==================================
        // DECISÃO APOIADA
        // ==================================


        result.decisionPermission =
            "allowed";


        result.recommendedAction =
            "decision";


        result.reasons.push(
            "evidência suficiente para decisão"
        );


        result.rules.push(
            this.rule(
                `${regionName}-decision-supported`,
                true,
                "info",
                `A região ${regionName} possui evidência suficiente para uma decisão de tratamento.`
            )
        );


        return result;
    }


    // ======================================
    // AVALIAR TODAS AS REGIÕES
    // ======================================


    evaluateRegions(
        plan
    ) {

        const results = [];


        if (
            !this.isObject(
                plan &&
                plan.regions
            )
        ) {

            return results;
        }


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


            results.push(
                this.evaluateRegion(
                    regionName,
                    plan.regions[
                        regionName
                    ],
                    plan
                )
            );
        }


        return results;
    }


    // ======================================
    // RESUMIR REGRAS
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
                !rule.passed &&
                rule.severity ===
                    "error"
            ) {

                summary.errors++;
            }


            if (
                !rule.passed &&
                rule.severity ===
                    "warning"
            ) {

                summary.warnings++;
            }
        }


        return summary;
    }


    // ======================================
    // DECISÃO GLOBAL
    // ======================================


    buildGlobalDecision(
        validation,
        globalRules,
        regionResults
    ) {

        if (
            !validation ||
            validation.valid !==
                true
        ) {

            return {

                decisionPermission:
                    "none",

                recommendation:
                    "fallback-to-observe",

                reason:
                    "Treatment Plan não validado."
            };
        }


        const globalSummary =
            this.summarizeRules(
                globalRules
            );


        if (
            globalSummary.errors >
                0
        ) {

            return {

                decisionPermission:
                    "none",

                recommendation:
                    "fallback-to-observe",

                reason:
                    "Existem erros nas evidências ou políticas de decisão."
            };
        }


        let decisionRegions =
            0;


        let blockedRegions =
            0;


        for (
            let i = 0;
            i < regionResults.length;
            i++
        ) {

            const region =
                regionResults[i];


            if (
                region.decisionPermission ===
                    "allowed"
            ) {

                decisionRegions++;
            }


            if (
                region.evidenceState ===
                    "uncertain" ||
                region.evidenceState ===
                    "unstable" ||
                region.evidenceState ===
                    "masked"
            ) {

                blockedRegions++;
            }
        }


        if (
            decisionRegions ===
                0
        ) {

            return {

                decisionPermission:
                    "none",

                recommendation:
                    "preserve",

                reason:
                    blockedRegions > 0
                        ? "Nenhuma região possui evidência suficiente para tratamento."
                        : "O plano não apresenta nenhuma decisão de tratamento autorizável."
            };
        }


        return {

            decisionPermission:
                "allowed",

            recommendation:
                "decision",

            reason:
                `${decisionRegions} região(ões) possuem evidência suficiente para decisão.`,

            decisionRegions,

            blockedRegions
        };
    }


    // ======================================
    // AVALIAÇÃO COMPLETA
    // ======================================


    evaluate(
        plan,
        validation
    ) {

        const globalRules = [

            ...this.validateValidatorResult(
                validation
            ),

            ...this.validateGlobalEvidence(
                plan
            ),

            ...this.validatePolicy(
                plan
            ),

            ...this.validateSafety(
                plan
            )
        ];


        const regionResults =
            this.evaluateRegions(
                plan
            );


        const globalDecision =
            this.buildGlobalDecision(
                validation,
                globalRules,
                regionResults
            );


        const summary =
            this.summarizeRules(
                globalRules
            );


        // HARD LOCK FINAL

        const processingPermission =
            "none";


        const audioProcessing =
            false;


        return {

            version:
                this.version,

            valid:
                summary.errors ===
                    0,

            decisionPermission:
                globalDecision
                    .decisionPermission,

            processingPermission,

            audioProcessing,

            recommendation:
                globalDecision
                    .recommendation,

            reason:
                globalDecision
                    .reason,

            globalRules,

            regionResults,

            summary,

            authority:
                "decision-gate-only"
        };
    }


    // ======================================
    // VERIFICAR DECISÃO
    // ======================================


    canDecide(
        result
    ) {

        return !!(
            result &&
            result.valid ===
                true &&
            result.decisionPermission ===
                "allowed" &&
            result.processingPermission ===
                "none" &&
            result.audioProcessing ===
                false
        );
    }


    // ======================================
    // VERIFICAR PROCESSAMENTO
    // ======================================


    canProcessAudio() {

        return false;
    }


    // ======================================
    // VERIFICAR RECONSTRUÇÃO
    // ======================================


    canReconstruct() {

        return false;
    }
}


// ==========================================
// DISPONIBILIZAÇÃO GLOBAL
// ==========================================


if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionGate =
        TreatmentDecisionGate;
}