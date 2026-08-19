// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL PROFILE
// V0.1
// ==========================================
//
// Camada intermediária entre:
//
// SpectralBalancer
//        ↓
// SpectralProfile
//        ↓
// VocalTreatmentPlan
//
// RESPONSABILIDADE:
//
// Interpretar a análise espectral.
//
// Este módulo NÃO:
//
// - altera AudioBuffer
// - aplica EQ
// - cria filtros
// - altera volume
// - altera timbre
// - reconstrói regiões
//
// Ele apenas transforma dados espectrais
// em informações de decisão.
//
// ==========================================


class SpectralProfile {


    constructor(options = {}) {


        // ==================================
        // CONFIGURAÇÃO
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.55;


        this.minimumStableBands =
            options.minimumStableBands ??
            5;


        this.referenceToleranceDb =
            options.referenceToleranceDb ??
            1.25;


        this.maxReferenceDistanceDb =
            options.maxReferenceDistanceDb ??
            4.0;


        this.minimumReferenceSeparationDb =
            options.minimumReferenceSeparationDb ??
            0.20;


        this.version =
            "0.1";
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
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    // ======================================
    // VALOR ABSOLUTO SEGURO
    // ======================================

    absolute(
        value
    ) {

        return Math.abs(
            this.safeNumber(
                value
            )
        );
    }


    // ======================================
    // OBTER COMPARAÇÃO
    // ======================================

    getComparison(
        analysis,
        name
    ) {

        if (
            !analysis ||
            !analysis.comparisons
        ) {

            return null;
        }


        return (
            analysis
                .comparisons[name]
            ||
            null
        );
    }


    // ======================================
    // CONTAR BANDAS ESTÁVEIS
    // ======================================

    countStableBands(
        analysis
    ) {

        if (
            !analysis ||
            !Array.isArray(
                analysis.bands
            )
        ) {

            return 0;
        }


        let count =
            0;


        for (
            let i = 0;
            i < analysis.bands.length;
            i++
        ) {

            const stability =
                this.safeNumber(
                    analysis
                        .bands[i]
                        .stability
                );


            if (
                stability >=
                this.minimumConfidence
            ) {

                count++;
            }
        }


        return count;
    }


    // ======================================
    // CONFIANÇA GLOBAL
    // ======================================

    calculateConfidence(
        analysis
    ) {

        if (
            !analysis
        ) {

            return 0;
        }


        const analysisConfidence =
            this.clamp(
                this.safeNumber(
                    analysis.confidence
                ),
                0,
                1
            );


        const stableBands =
            this.countStableBands(
                analysis
            );


        const stableBandConfidence =
            this.clamp(
                stableBands /
                Math.max(
                    this.minimumStableBands,
                    1
                ),
                0,
                1
            );


        return this.clamp(
            (
                analysisConfidence *
                0.65
            ) +
            (
                stableBandConfidence *
                0.35
            ),
            0,
            1
        );
    }


    // ======================================
    // DISTÂNCIA MÉDIA DA REFERÊNCIA
    // ======================================

    calculateReferenceDistance(
        comparison
    ) {

        if (
            !comparison ||
            !Array.isArray(
                comparison.comparisons
            ) ||
            comparison.comparisons.length === 0
        ) {

            return {

                distanceDb:
                    Infinity,

                weightedDistanceDb:
                    Infinity,

                usableBands:
                    0,

                stableBands:
                    0
            };
        }


        let absoluteSum =
            0;


        let weightedSum =
            0;


        let weightSum =
            0;


        let usableBands =
            0;


        let stableBands =
            0;


        for (
            let i = 0;
            i <
            comparison.comparisons.length;
            i++
        ) {

            const band =
                comparison
                    .comparisons[i];


            const distance =
                this.safeNumber(
                    band.distanceDb,
                    0
                );


            const confidence =
                this.clamp(
                    this.safeNumber(
                        band.confidence,
                        0
                    ),
                    0,
                    1
                );


            const absoluteDistance =
                this.absolute(
                    distance
                );


            /*
             * Distâncias absurdamente grandes
             * não devem dominar a decisão.
             */

            const boundedDistance =
                this.clamp(
                    absoluteDistance,
                    0,
                    this.maxReferenceDistanceDb
                );


            /*
             * Bandas muito instáveis
             * têm peso menor.
             */

            const weight =
                Math.max(
                    0.05,
                    confidence
                );


            absoluteSum +=
                boundedDistance;


            weightedSum +=
                boundedDistance *
                weight;


            weightSum +=
                weight;


            usableBands++;


            if (
                confidence >=
                this.minimumConfidence
            ) {

                stableBands++;
            }
        }


        const distanceDb =
            usableBands > 0
                ? absoluteSum /
                  usableBands
                : Infinity;


        const weightedDistanceDb =
            weightSum > 0
                ? weightedSum /
                  weightSum
                : Infinity;


        return {

            distanceDb,

            weightedDistanceDb,

            usableBands,

            stableBands
        };
    }


    // ======================================
    // IDENTIFICAR REFERÊNCIA MAIS PRÓXIMA
    // ======================================

    determineClosestReference(
        references
    ) {

        const names = [
            "neutral",
            "warm",
            "bright"
        ];


        let closest =
            null;


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const name =
                names[i];


            const item =
                references[name];


            if (
                !item ||
                !Number.isFinite(
                    item.weightedDistanceDb
                )
            ) {

                continue;
            }


            if (
                closest === null ||
                item.weightedDistanceDb <
                closest.weightedDistanceDb
            ) {

                closest = {

                    name,

                    weightedDistanceDb:
                        item.weightedDistanceDb,

                    distanceDb:
                        item.distanceDb
                };
            }
        }


        return closest;
    }


    // ======================================
    // SEPARAÇÃO ENTRE REFERÊNCIAS
    // ======================================
    //
    // Se Neutral, Warm e Bright estiverem
    // praticamente empatados, não devemos
    // fingir que sabemos qual tonalidade
    // é melhor.
    //
    // ======================================

    calculateReferenceSeparation(
        references,
        closest
    ) {

        if (
            !closest
        ) {

            return {

                separationDb:
                    0,

                ambiguous:
                    true
            };
        }


        const distances = [];


        const names = [
            "neutral",
            "warm",
            "bright"
        ];


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const item =
                references[
                    names[i]
                ];


            if (
                item &&
                Number.isFinite(
                    item.weightedDistanceDb
                )
            ) {

                distances.push(
                    item.weightedDistanceDb
                );
            }
        }


        distances.sort(
            (
                a,
                b
            ) =>
                a - b
        );


        if (
            distances.length < 2
        ) {

            return {

                separationDb:
                    0,

                ambiguous:
                    true
            };
        }


        const separationDb =
            distances[1] -
            distances[0];


        return {

            separationDb,

            ambiguous:
                separationDb <
                this.minimumReferenceSeparationDb
        };
    }


    // ======================================
    // CLASSIFICAR TENDÊNCIA
    // ======================================

    classifyTonalTendency(
        closest,
        separation,
        confidence
    ) {

        if (
            !closest
        ) {

            return {

                label:
                    "unknown",

                confidence:
                    0,

                actionable:
                    false
            };
        }


        if (
            confidence <
            this.minimumConfidence
        ) {

            return {

                label:
                    "unknown",

                confidence,

                actionable:
                    false
            };
        }


        if (
            separation.ambiguous
        ) {

            return {

                label:
                    "neutral",

                confidence:
                    confidence *
                    0.50,

                actionable:
                    false
            };
        }


        /*
         * A classificação só é considerada
         * realmente útil quando a referência
         * mais próxima também está dentro
         * de uma distância razoável.
         */

        if (
            closest.weightedDistanceDb >
            this.maxReferenceDistanceDb
        ) {

            return {

                label:
                    "outside-reference",

                confidence:
                    confidence *
                    0.50,

                actionable:
                    false
            };
        }


        return {

            label:
                closest.name,

            confidence,

            actionable:
                true
        };
    }


    // ======================================
    // MEDIR DIREÇÃO ESPECTRAL
    // ======================================
    //
    // Mede se a gravação tende a acumular
    // energia relativa em regiões baixas
    // ou altas.
    //
    // Isso é complementar à escolha
    // Neutral/Warm/Bright.
    //
    // ======================================

    calculateSpectralTilt(
        analysis
    ) {

        if (
            !analysis ||
            !Array.isArray(
                analysis.bands
            ) ||
            analysis.bands.length === 0
        ) {

            return {

                lowEnergy:
                    0,

                highEnergy:
                    0,

                tilt:
                    0
            };
        }


        let low =
            0;


        let high =
            0;


        let lowWeight =
            0;


        let highWeight =
            0;


        for (
            let i = 0;
            i < analysis.bands.length;
            i++
        ) {

            const band =
                analysis.bands[i];


            const frequency =
                this.safeNumber(
                    band.centerFrequency
                );


            const energy =
                Math.max(
                    0,
                    this.safeNumber(
                        band.spectrumShare
                    )
                );


            const stability =
                this.clamp(
                    this.safeNumber(
                        band.stability
                    ),
                    0,
                    1
                );


            const weightedEnergy =
                energy *
                Math.max(
                    0.10,
                    stability
                );


            if (
                frequency <
                700
            ) {

                low +=
                    weightedEnergy;


                lowWeight +=
                    Math.max(
                        0.10,
                        stability
                    );
            }


            else if (
                frequency >=
                3000
            ) {

                high +=
                    weightedEnergy;


                highWeight +=
                    Math.max(
                        0.10,
                        stability
                    );
            }
        }


        const lowEnergy =
            lowWeight > 0
                ? low /
                  lowWeight
                : 0;


        const highEnergy =
            highWeight > 0
                ? high /
                  highWeight
                : 0;


        const tilt =
            highEnergy -
            lowEnergy;


        return {

            lowEnergy,

            highEnergy,

            tilt
        };
    }


    // ======================================
    // GERAR PERFIL
    // ======================================

    analyze(
        analysis
    ) {

        if (
            !analysis
        ) {

            return {

                version:
                    this.version,

                valid:
                    false,

                confidence:
                    0
            };
        }


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        const confidence =
            this.calculateConfidence(
                analysis
            );


        // ----------------------------------
        // REFERÊNCIAS
        // ----------------------------------

        const referenceNames = [
            "neutral",
            "warm",
            "bright"
        ];


        const references = {};


        for (
            let i = 0;
            i <
            referenceNames.length;
            i++
        ) {

            const name =
                referenceNames[i];


            const comparison =
                this.getComparison(
                    analysis,
                    name
                );


            references[name] =
                this.calculateReferenceDistance(
                    comparison
                );
        }


        // ----------------------------------
        // REFERÊNCIA MAIS PRÓXIMA
        // ----------------------------------

        const closest =
            this.determineClosestReference(
                references
            );


        // ----------------------------------
        // AMBIGUIDADE
        // ----------------------------------

        const separation =
            this.calculateReferenceSeparation(
                references,
                closest
            );


        // ----------------------------------
        // TENDÊNCIA
        // ----------------------------------

        const tendency =
            this.classifyTonalTendency(
                closest,
                separation,
                confidence
            );


        // ----------------------------------
        // INCLINAÇÃO
        // ----------------------------------

        const tilt =
            this.calculateSpectralTilt(
                analysis
            );


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        return {

            version:
                this.version,


            valid:
                true,


            confidence:
                confidence,


            stableBands:
                this.countStableBands(
                    analysis
                ),


            references:
                references,


            closestReference:
                closest
                    ? closest.name
                    : "unknown",


            referenceSeparationDb:
                separation.separationDb,


            ambiguous:
                separation.ambiguous,


            tonalTendency:
                tendency.label,


            tonalConfidence:
                tendency.confidence,


            actionable:
                tendency.actionable,


            spectralTilt:
                tilt,


            decisionHints: {

                preserveIfLowConfidence:
                    confidence <
                    this.minimumConfidence,

                preserveIfAmbiguous:
                    separation.ambiguous,

                avoidAutomaticCorrection:
                    true
            }
        };
    }


    // ======================================
    // ALIAS
    // ======================================

    analyzeProfile(
        analysis
    ) {

        return this.analyze(
            analysis
        );
    }


    // ======================================
    // ÚLTIMO PERFIL
    // ======================================

    getLastProfile() {

        return this.lastProfile ||
            null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralProfile =
    SpectralProfile;