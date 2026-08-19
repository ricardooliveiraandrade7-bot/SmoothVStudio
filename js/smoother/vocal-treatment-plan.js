// ==========================================
// SMOOTHVSTUDIO
// VOCAL TREATMENT PLAN
// V0.1
// ==========================================
//
// Camada de decisão espectral.
//
// IMPORTANTE:
//
// Este módulo NÃO modifica áudio.
//
// Ele recebe a análise do VocalAnalyzer
// e produz um plano de tratamento.
//
// Estados possíveis:
//
// - preserve
// - improve
// - correct
// - reconstruct
//
// A reconstrução permanece desativada
// nesta primeira versão.
//
// ==========================================


class VocalTreatmentPlan {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // LIMITES DE SEGURANÇA
        // ==================================

        this.maxBoostDb =
            options.maxBoostDb ??
            2.0;


        this.maxCutDb =
            options.maxCutDb ??
            -2.5;


        this.minimumConfidence =
            options.minimumConfidence ??
            0.60;


        this.reconstructionEnabled =
            options.reconstructionEnabled ??
            false;
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

        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    // ======================================
    // CONVERTER VALOR EM DECISÃO
    // ======================================

    createDecision(
        name,
        score,
        options = {}
    ) {

        const safeScore =
            this.clamp(
                this.safeNumber(
                    score
                ),
                0,
                1
            );


        const confidence =
            this.clamp(
                this.safeNumber(
                    options.confidence,
                    0
                ),
                0,
                1
            );


        /*
         * Sem confiança suficiente,
         * a engine preserva a região.
         */

        if (
            confidence <
            this.minimumConfidence
        ) {

            return {

                name,

                state:
                    "preserve",

                score:
                    safeScore,

                confidence,

                targetDb:
                    0,

                reconstruction:
                    false
            };
        }


        let state =
            "preserve";


        let targetDb =
            0;


        // ==================================
        // EXCESSO
        // ==================================

        if (
            options.excessive === true
        ) {

            if (
                safeScore >=
                0.70
            ) {

                state =
                    "correct";


                targetDb =
                    this.maxCutDb *
                    this.clamp(
                        (
                            safeScore -
                            0.60
                        ) /
                        0.40,
                        0,
                        1
                    );
            }

            else if (
                safeScore >=
                0.50
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxCutDb *
                    0.45;
            }
        }


        // ==================================
        // DEFICIÊNCIA
        // ==================================

        if (
            options.deficient === true
        ) {

            if (
                safeScore >=
                0.75
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxBoostDb *
                    this.clamp(
                        (
                            safeScore -
                            0.60
                        ) /
                        0.40,
                        0,
                        1
                    );
            }

            else if (
                safeScore >=
                0.55
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxBoostDb *
                    0.35;
            }
        }


        // ==================================
        // RECONSTRUÇÃO
        // ==================================

        if (
            options.reconstructionScore >=
            0.80 &&
            this.reconstructionEnabled
        ) {

            state =
                "reconstruct";


            targetDb =
                this.clamp(
                    targetDb,
                    0,
                    this.maxBoostDb
                );
        }


        return {

            name,

            state,

            score:
                safeScore,

            confidence,

            targetDb,

            reconstruction:
                state ===
                "reconstruct"
        };
    }


    // ======================================
    // CORPO
    // ======================================

    analyzeBody(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const body =
            this.safeNumber(
                characteristics.body
            );


        /*
         * Body baixo indica possível
         * necessidade de recuperação.
         *
         * Não aplicamos ganho aqui.
         */

        const deficiency =
            this.clamp(
                1 -
                body,
                0,
                1
            );


        const confidence =
            this.clamp(
                body >= 0.05
                    ? 0.72
                    : 0.40,
                0,
                1
            );


        return this.createDecision(
            "body",
            deficiency,
            {

                deficient:
                    true,

                confidence,

                reconstructionScore:
                    deficiency
            }
        );
    }


    // ======================================
    // GRAVE
    // ======================================

    analyzeBass(
        analysis
    ) {

        const bands =
            analysis.bands ||
            {};


        const ratios =
            analysis.ratios ||
            {};


        const body =
            this.safeNumber(
                bands.body
            );


        const bodyRatio =
            this.safeNumber(
                ratios.body
            );


        /*
         * Excesso de grave não deve ser
         * confundido com falta de corpo.
         *
         * Usamos duas evidências.
         */

        const excessive =
            this.clamp(
                (
                    bodyRatio -
                    0.25
                ) /
                0.35,
                0,
                1
            );


        const deficiency =
            this.clamp(
                (
                    0.03 -
                    bodyRatio
                ) /
                0.03,
                0,
                1
            );


        const confidence =
            body > 0.00001
                ? 0.65
                : 0.40;


        if (
            excessive >
            deficiency
        ) {

            return this.createDecision(
                "bass",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "bass",
            deficiency,
            {

                deficient:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // MÉDIO
    // ======================================

    analyzeMid(
        analysis
    ) {

        const bands =
            analysis.bands ||
            {};


        const mid =
            this.safeNumber(
                bands.mid
            );


        const lowMid =
            this.safeNumber(
                bands.lowMid
            );


        /*
         * Relação médio / médio-grave.
         *
         * Uma relação muito alta pode
         * sugerir concentração nos médios.
         */

        const ratio =
            lowMid > 0
                ? mid /
                  lowMid
                : 0;


        const excessive =
            this.clamp(
                (
                    ratio -
                    1.25
                ) /
                1.25,
                0,
                1
            );


        const deficient =
            this.clamp(
                (
                    0.45 -
                    ratio
                ) /
                0.45,
                0,
                1
            );


        const confidence =
            mid > 0.00001
                ? 0.68
                : 0.40;


        if (
            excessive >
            deficient
        ) {

            return this.createDecision(
                "mid",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "mid",
            deficient,
            {

                deficient:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // PRESENÇA
    // ======================================

    analyzePresence(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const presence =
            this.safeNumber(
                characteristics.presence
            );


        const deficiency =
            this.clamp(
                1 -
                presence,
                0,
                1
            );


        const excessive =
            this.clamp(
                (
                    presence -
                    0.80
                ) /
                0.20,
                0,
                1
            );


        const confidence =
            presence > 0.03
                ? 0.72
                : 0.42;


        if (
            excessive >
            deficiency
        ) {

            return this.createDecision(
                "presence",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "presence",
            deficiency,
            {

                deficient:
                    true,

                confidence,

                reconstructionScore:
                    deficiency
            }
        );
    }


    // ======================================
    // DUREZA / MÉDIO-AGUDO
    // ======================================

    analyzeHarshness(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const hardness =
            this.safeNumber(
                characteristics.hardness
            );


        const roughness =
            this.safeNumber(
                characteristics.roughness
            );


        const score =
            this.clamp(
                (
                    hardness *
                    0.65
                ) +
                (
                    roughness *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            0.78;


        return this.createDecision(
            "harshness",
            score,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // SIBILÂNCIA
    // ======================================

    analyzeSibilance(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const sibilance =
            this.safeNumber(
                characteristics.sibilance
            );


        const temporal =
            this.safeNumber(
                analysis
                    .sibilanceAnalysis
                    ?.temporal
            );


        const score =
            this.clamp(
                (
                    sibilance *
                    0.65
                ) +
                (
                    temporal *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            temporal >
            0.05
                ? 0.82
                : 0.65;


        return this.createDecision(
            "sibilance",
            score,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // AIR
    // ======================================

    analyzeAir(
        analysis
    ) {

        const ratios =
            analysis.ratios ||
            {};


        const air =
            this.safeNumber(
                ratios.air
            );


        const noise =
            analysis.noiseAnalysis ||
            {};


        const noiseConfidence =
            this.safeNumber(
                noise.confidence
            );


        const noiseHigh =
            this.safeNumber(
                noise.highRelative
            );


        /*
         * Air alto não é automaticamente
         * ruim.
         *
         * Só consideramos excesso quando
         * há evidência adicional.
         */

        const excessive =
            this.clamp(
                (
                    air -
                    0.16
                ) /
                0.18,
                0,
                1
            );


        const noiseFactor =
            this.clamp(
                noiseHigh *
                3,
                0,
                1
            );


        const combined =
            this.clamp(
                (
                    excessive *
                    0.65
                ) +
                (
                    noiseFactor *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            noiseConfidence >= 0.60
                ? 0.78
                : 0.64;


        return this.createDecision(
            "air",
            combined,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // GERAR PLANO
    // ======================================

    createPlan(
        analysis
    ) {

        if (
            !analysis
        ) {

            throw new Error(
                "Análise vocal inválida."
            );
        }


        const plan = {

            version:
                this.version,


            // ==================================
            // REGIÕES
            // ==================================

            regions: {

                bass:
                    this.analyzeBass(
                        analysis
                    ),

                body:
                    this.analyzeBody(
                        analysis
                    ),

                mid:
                    this.analyzeMid(
                        analysis
                    ),

                presence:
                    this.analyzePresence(
                        analysis
                    ),

                harshness:
                    this.analyzeHarshness(
                        analysis
                    ),

                sibilance:
                    this.analyzeSibilance(
                        analysis
                    ),

                air:
                    this.analyzeAir(
                        analysis
                    )
            },


            // ==================================
            // RECONSTRUÇÃO
            // ==================================

            reconstruction: {

                enabled:
                    this.reconstructionEnabled,

                body:
                    false,

                presence:
                    false,

                air:
                    false
            },


            // ==================================
            // SEGURANÇA
            // ==================================

            safety: {

                maxBoostDb:
                    this.maxBoostDb,

                maxCutDb:
                    this.maxCutDb,

                minimumConfidence:
                    this.minimumConfidence
            }
        };


        return plan;
    }


    // ======================================
    // RESUMO
    // ======================================

    summarize(
        plan
    ) {

        if (
            !plan ||
            !plan.regions
        ) {

            return [];
        }


        const summary = [];


        const regions =
            plan.regions;


        for (
            const key in regions
        ) {

            const region =
                regions[key];


            summary.push({

                region:
                    key,

                state:
                    region.state,

                targetDb:
                    region.targetDb,

                confidence:
                    region.confidence
            });
        }


        return summary;
    }
}


// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalTreatmentPlan =
    VocalTreatmentPlan;