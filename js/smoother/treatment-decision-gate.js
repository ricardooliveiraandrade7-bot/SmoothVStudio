// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DECISION GATE
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Determinar se existe evidência suficiente
// para transformar um Treatment Plan coerente
// em uma DECISÃO DE TRATAMENTO.
//
// Fluxo:
//
// Analyzer / Measurement
//        ↓
// Diagnostic Observer
//        ↓
// Treatment Bridge
//        ↓
// VocalTreatmentPlan
//        ↓
// TreatmentPlanValidator
//        ↓
// TreatmentDecisionGate
//        ↓
// DECISION
//        ↓
// futura autoridade DSP
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
// - libera processamento de áudio
// - altera o Treatment Plan
//
// DECISION ALLOWED ≠ DSP ALLOWED
//
// Mesmo quando uma decisão for autorizada:
//
// processingPermission = "none"
//
// ==========================================


class TreatmentDecisionGate {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // LIMITES DE DECISÃO
        // ==================================

        this.minimumDiagnosticConfidence =
            options.minimumDiagnosticConfidence ??
            0.60;


        this.minimumRegionalConfidence =
            options.minimumRegionalConfidence ??
            0.55;


        this.minimumRegionalCoverage =
            options.minimumRegionalCoverage ??
            0.50;


        // ==================================
        // ESTADOS QUE NÃO AUTORIZAM
        // TRATAMENTO
        // ==================================

        this.blockedRegionalStates =
            new Set([

                "uncertain",
                "unstable",
                "masked"

            ]);


        // ==================================
        // ESTADOS QUE REPRESENTAM
        // PRESERVAÇÃO
        // ==================================

        this.preservedRegionalStates =
            new Set([

                "natural",
                "supported"

            ]);


        // ==================================
        // AUTORIDADE
        // ==================================
        //
        // Esta camada ainda NÃO concede
        // autoridade DSP.
        //

        this.processingPermission =
            "none";


        this.decisionPermission =
            "none";
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
    // VALIDAR OBJETO
    // ======================================

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


    // ======================================
    // EXTRAIR DIAGNÓSTICO
    // ======================================

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


    // ======================================
    // EXTRAIR SEGURANÇA
    // ======================================

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
    // VALIDAR EXISTÊNCIA DO VALIDATOR
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
    // VALIDAR CONFIANÇA GLOBAL
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


        if (
            !policy
        ) {

            rules.push(
                this.rule(
                    "decision-policy-exists",
                    false,
                    "warning",
                    "Política explícita de decisão não encontrada."
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
    // VALIDAR UMA DECISÃO REGIONAL
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


        // ==================================
        // DECISÃO AUSENTE
        // ==================================

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
        // REGRA: ESTADO BLOQUEADO
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


        // ==================================
        // REGRA: NATURAL
        // ==================================

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
        // REGRA: CONTEXTO REGIONAL
        // ==================================

        const context =
            this.getDiagnosticContext(
                plan
            );


        const diagnostic =
            this.getDiagnostic(
                plan
            );


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
        // REGRA: CONFIANÇA GLOBAL
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
        // REGRA: CONFIANÇA REGIONAL
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
        // REGRA: COBERTURA
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
        // REGRA: DECISÃO DE PRESERVAÇÃO
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
        // DECISÃO POTENCIALMENTE AUTORIZADA
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


            const decision =
                plan.regions[
                    regionName
                ];


            results.push(
                this.evaluateRegion(
                    regionName,
                    decision,
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

        // ==================================
        // ERROS DO VALIDATOR
        // ==================================

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


        // ==================================
        // ERROS GLOBAIS
        // ==================================

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


        // ==================================
        // VERIFICAR REGIÕES DECIDÍVEIS
        // ==================================

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


        // ==================================
        // NENHUMA REGIÃO DECIDÍVEL
        // ==================================

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


        // ==================================
        // EXISTEM REGIÕES DECIDÍVEIS
        // ==================================

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


        // ==================================
        // SEGURANÇA FINAL
        // ==================================

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
    //
    // Retorna true somente quando existe
    // base suficiente para uma decisão.
    //
    // NUNCA significa autorização DSP.
    //
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
    //
    // Hard lock.
    //
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

window.TreatmentDecisionGate =
    TreatmentDecisionGate;