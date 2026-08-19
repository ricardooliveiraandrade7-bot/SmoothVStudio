// ==========================================
// SMOOTHVSTUDIO
// VOCAL ANALYZER
// V0.5
// ==========================================
//
// Analisa o vocal antes do processamento.
//
// O Analyzer NÃO modifica o áudio.
//
// Evolução V0.5:
//
// - análise geral do vocal
// - análise por bandas
// - análise temporal da sibilância
// - detecção de picos de energia sibilante
// - estimativa de atividade sibilante
// - detecção preliminar de baixa atividade
// - estimativa adaptativa do noise floor
// - perfil espectral simplificado do ruído
// - confiança da estimativa de ruído
//
// IMPORTANTE:
//
// Esta versão NÃO remove ruído.
//
// Ela apenas fornece informações para
// futuras etapas adaptativas.
//
// Arquitetura modular:
//
// este módulo pode evoluir
// independentemente de:
//
// - VocalDynamics
// - VocalSibilance
// - VocalSmoother
//
// ==========================================


class VocalAnalyzer {


    constructor(options = {}) {

        this.sampleRate =
            options.sampleRate ||
            44100;


        this.windowMs =
            options.windowMs ??
            20;


        this.hopMs =
            options.hopMs ??
            10;


        this.analysis =
            null;
    }


    // ======================================
    // LIMITADOR
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
    // AMPLITUDE → DB
    // ======================================

    amplitudeToDb(
        amplitude
    ) {

        if (
            amplitude <= 0
        ) {

            return -120;
        }


        return 20 *
            Math.log10(
                amplitude
            );
    }


    // ======================================
    // RMS
    // ======================================

    calculateRMS(
        data
    ) {

        if (
            !data ||
            data.length === 0
        ) {

            return 0;
        }


        let sum = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const sample =
                data[i];


            sum +=
                sample *
                sample;
        }


        return Math.sqrt(
            sum /
            data.length
        );
    }


    // ======================================
    // RMS DE UMA REGIÃO
    // ======================================

    calculateRMSRange(
        data,
        start,
        end
    ) {

        if (
            !data ||
            data.length === 0
        ) {

            return 0;
        }


        const safeStart =
            Math.max(
                0,
                Math.floor(start)
            );


        const safeEnd =
            Math.min(
                data.length,
                Math.floor(end)
            );


        if (
            safeEnd <= safeStart
        ) {

            return 0;
        }


        let sum = 0;


        for (
            let i = safeStart;
            i < safeEnd;
            i++
        ) {

            const sample =
                data[i];


            sum +=
                sample *
                sample;
        }


        return Math.sqrt(
            sum /
            (
                safeEnd -
                safeStart
            )
        );
    }


    // ======================================
    // PICO
    // ======================================

    calculatePeak(
        data
    ) {

        let peak = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const value =
                Math.abs(
                    data[i]
                );


            if (
                value > peak
            ) {

                peak = value;
            }
        }


        return peak;
    }


    // ======================================
    // FILTRO LOW-PASS SIMPLES
    // ======================================

    lowPass(
        data,
        sampleRate,
        cutoff
    ) {

        const output =
            new Float32Array(
                data.length
            );


        const rc =
            1 /
            (
                2 *
                Math.PI *
                cutoff
            );


        const dt =
            1 /
            sampleRate;


        const alpha =
            dt /
            (
                rc +
                dt
            );


        let previous =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            previous +=
                alpha *
                (
                    data[i] -
                    previous
                );


            output[i] =
                previous;
        }


        return output;
    }


    // ======================================
    // ENERGIA DE UMA FAIXA
    // ======================================

    calculateBandEnergy(
        data,
        sampleRate,
        lowCut,
        highCut
    ) {

        const lowPassed =
            this.lowPass(
                data,
                sampleRate,
                highCut
            );


        let highPassed;


        if (
            lowCut <= 20
        ) {

            highPassed =
                data;

        } else {

            const lower =
                this.lowPass(
                    data,
                    sampleRate,
                    lowCut
                );


            highPassed =
                new Float32Array(
                    data.length
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                highPassed[i] =
                    lowPassed[i] -
                    lower[i];
            }
        }


        return this.calculateRMS(
            highPassed
        );
    }


    // ======================================
    // CRIAR BANDA FILTRADA
    // ======================================

    createBandSignal(
        data,
        sampleRate,
        lowCut,
        highCut
    ) {

        const high =
            this.lowPass(
                data,
                sampleRate,
                highCut
            );


        if (
            lowCut <= 20
        ) {

            return high;
        }


        const low =
            this.lowPass(
                data,
                sampleRate,
                lowCut
            );


        const band =
            new Float32Array(
                data.length
            );


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            band[i] =
                high[i] -
                low[i];
        }


        return band;
    }


    // ======================================
    // MONO
    // ======================================

    createMonoBuffer(
        audioBuffer
    ) {

        const length =
            audioBuffer.length;


        const channels =
            audioBuffer.numberOfChannels;


        const mono =
            new Float32Array(
                length
            );


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                mono[i] +=
                    data[i] /
                    channels;
            }
        }


        return mono;
    }


    // ======================================
    // ANALISAR SIBILÂNCIA NO TEMPO
    // ======================================

    analyzeSibilanceTimeline(
        mono,
        sampleRate,
        totalRms
    ) {

        const sibilanceSignal =
            this.createBandSignal(
                mono,
                sampleRate,
                5000,
                9500
            );


        const windowSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.windowMs /
                        1000
                    )
                )
            );


        const hopSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.hopMs /
                        1000
                    )
                )
            );


        const frames =
            [];


        let peakEnergy =
            0;


        let sumEnergy =
            0;


        let activeFrames =
            0;


        const activityThreshold =
            Math.max(
                totalRms *
                0.18,
                0.00001
            );


        for (
            let start = 0;
            start < mono.length;
            start += hopSize
        ) {

            const end =
                Math.min(
                    mono.length,
                    start +
                    windowSize
                );


            if (
                end <= start
            ) {

                break;
            }


            const rms =
                this.calculateRMSRange(
                    sibilanceSignal,
                    start,
                    end
                );


            const db =
                this.amplitudeToDb(
                    rms
                );


            const time =
                start /
                sampleRate;


            frames.push({

                time,

                rms,

                db
            });


            sumEnergy +=
                rms;


            if (
                rms >
                peakEnergy
            ) {

                peakEnergy =
                    rms;
            }


            if (
                rms >
                activityThreshold
            ) {

                activeFrames++;
            }
        }


        const frameCount =
            frames.length;


        const averageEnergy =
            frameCount > 0
                ? sumEnergy /
                  frameCount
                : 0;


        const activity =
            frameCount > 0
                ? activeFrames /
                  frameCount
                : 0;


        const peakToAverage =
            averageEnergy > 0
                ? peakEnergy /
                  averageEnergy
                : 0;


        const averageRelative =
            totalRms > 0
                ? averageEnergy /
                  totalRms
                : 0;


        const peakRelative =
            totalRms > 0
                ? peakEnergy /
                  totalRms
                : 0;


        const averageScore =
            this.clamp(
                averageRelative *
                4,
                0,
                1
            );


        const peakScore =
            this.clamp(
                peakRelative *
                5,
                0,
                1
            );


        const concentrationScore =
            this.clamp(
                (
                    peakToAverage -
                    1
                ) /
                4,
                0,
                1
            );


        const activityScore =
            this.clamp(
                activity *
                2.5,
                0,
                1
            );


        const temporalScore =
            this.clamp(
                (
                    averageScore *
                    0.30
                ) +
                (
                    peakScore *
                    0.35
                ) +
                (
                    concentrationScore *
                    0.20
                ) +
                (
                    activityScore *
                    0.15
                ),
                0,
                1
            );


        return {

            windowMs:
                this.windowMs,

            hopMs:
                this.hopMs,

            frameCount,

            averageEnergy,

            peakEnergy,

            peakDb:
                this.amplitudeToDb(
                    peakEnergy
                ),

            activity,

            peakToAverage,

            averageRelative,

            peakRelative,

            temporalScore,

            frames
        };
    }


    // ======================================
    // ANALISAR PERFIL DE RUÍDO
    // ======================================
    //
    // Esta função NÃO remove ruído.
    //
    // Ela procura janelas onde o sinal
    // possui baixa atividade relativa.
    //
    // Nessas janelas estimamos:
    //
    // - noise floor
    // - persistência
    // - distribuição grave
    // - distribuição média
    // - distribuição aguda
    //
    // A análise é deliberadamente
    // conservadora.
    //
    // ======================================

    analyzeNoiseProfile(
        mono,
        sampleRate,
        totalRms
    ) {

        const windowSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.windowMs /
                        1000
                    )
                )
            );


        const hopSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.hopMs /
                        1000
                    )
                )
            );


        if (
            mono.length === 0 ||
            totalRms <= 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                floor:
                    0,

                floorDb:
                    -120,

                low:
                    0,

                mid:
                    0,

                high:
                    0,

                persistence:
                    0,

                profile:
                    "unknown",

                analyzedFrames:
                    0,

                lowActivityFrames:
                    0
            };
        }


        /*
         * Abaixo deste nível relativo
         * consideramos a janela como
         * potencialmente pouco ativa.
         *
         * Não chamamos isso de silêncio.
         */

        const lowActivityThreshold =
            Math.max(
                totalRms *
                0.22,
                0.00001
            );


        let analyzedFrames =
            0;


        let lowActivityFrames =
            0;


        let sumNoiseRms =
            0;


        let sumLow =
            0;


        let sumMid =
            0;


        let sumHigh =
            0;


        /*
         * Número de janelas que apresentam
         * baixa atividade consecutivamente.
         *
         * Isso ajuda a diferenciar um
         * pequeno espaço entre palavras
         * de um componente ambiental
         * persistente.
         */

        let consecutiveLow =
            0;


        let persistentLowFrames =
            0;


        /*
         * Para reduzir custo de memória,
         * analisamos as bandas somente
         * dentro das janelas selecionadas.
         *
         * Não criamos seis buffers adicionais
         * para o arquivo inteiro.
         */

        for (
            let start = 0;
            start < mono.length;
            start += hopSize
        ) {

            const end =
                Math.min(
                    mono.length,
                    start +
                    windowSize
                );


            if (
                end <= start
            ) {

                break;
            }


            analyzedFrames++;


            const rms =
                this.calculateRMSRange(
                    mono,
                    start,
                    end
                );


            if (
                rms <=
                lowActivityThreshold
            ) {

                lowActivityFrames++;

                consecutiveLow++;


                if (
                    consecutiveLow >= 2
                ) {

                    persistentLowFrames++;
                }


                /*
                 * Dentro da janela selecionada
                 * calculamos três regiões amplas.
                 *
                 * Isso é suficiente nesta etapa.
                 *
                 * A análise fina virá somente
                 * quando tivermos confiança
                 * de que existe um perfil de ruído.
                 */

                const windowData =
                    mono.subarray(
                        start,
                        end
                    );


                const low =
                    this.calculateBandEnergy(
                        windowData,
                        sampleRate,
                        20,
                        250
                    );


                const mid =
                    this.calculateBandEnergy(
                        windowData,
                        sampleRate,
                        250,
                        2500
                    );


                const high =
                    this.calculateBandEnergy(
                        windowData,
                        sampleRate,
                        2500,
                        Math.min(
                            12000,
                            sampleRate / 2 -
                            100
                        )
                    );


                sumNoiseRms +=
                    rms;


                sumLow +=
                    low;


                sumMid +=
                    mid;


                sumHigh +=
                    high;

            } else {

                consecutiveLow =
                    0;
            }
        }


        if (
            lowActivityFrames === 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                floor:
                    0,

                floorDb:
                    -120,

                low:
                    0,

                mid:
                    0,

                high:
                    0,

                persistence:
                    0,

                profile:
                    "unknown",

                analyzedFrames,

                lowActivityFrames
            };
        }


        const floor =
            sumNoiseRms /
            lowActivityFrames;


        const floorDb =
            this.amplitudeToDb(
                floor
            );


        const lowEnergy =
            sumLow /
            lowActivityFrames;


        const midEnergy =
            sumMid /
            lowActivityFrames;


        const highEnergy =
            sumHigh /
            lowActivityFrames;


        const lowRelative =
            totalRms > 0
                ? lowEnergy /
                  totalRms
                : 0;


        const midRelative =
            totalRms > 0
                ? midEnergy /
                  totalRms
                : 0;


        const highRelative =
            totalRms > 0
                ? highEnergy /
                  totalRms
                : 0;


        const lowActivityRatio =
            analyzedFrames > 0
                ? lowActivityFrames /
                  analyzedFrames
                : 0;


        const persistence =
            lowActivityFrames > 0
                ? persistentLowFrames /
                  lowActivityFrames
                : 0;


        /*
         * Confiança da estimativa.
         *
         * Queremos evitar afirmar que
         * "aprendemos o ruído" quando
         * praticamente não existem
         * janelas adequadas.
         */

        const sampleConfidence =
            this.clamp(
                lowActivityRatio *
                2.5,
                0,
                1
            );


        const persistenceConfidence =
            this.clamp(
                persistence *
                1.5,
                0,
                1
            );


        const stabilityConfidence =
            this.clamp(
                (
                    1 -
                    Math.abs(
                        highRelative -
                        midRelative
                    )
                ),
                0,
                1
            );


        const confidence =
            this.clamp(
                (
                    sampleConfidence *
                    0.45
                ) +
                (
                    persistenceConfidence *
                    0.35
                ) +
                (
                    stabilityConfidence *
                    0.20
                ),
                0,
                1
            );


        /*
         * Intensidade relativa do piso.
         *
         * Não representa uma redução.
         */

        const floorRelative =
            totalRms > 0
                ? floor /
                  totalRms
                : 0;


        let profile =
            "low";


        if (
            floorRelative >=
            0.18
        ) {

            profile =
                "high";

        } else if (
            floorRelative >=
            0.08
        ) {

            profile =
                "moderate";
        }


        /*
         * A classificação só é considerada
         * útil quando existe alguma confiança.
         */

        const available =
            confidence >=
            0.35;


        return {

            available,

            confidence,

            floor,

            floorDb,

            floorRelative,

            low:
                lowEnergy,

            mid:
                midEnergy,

            high:
                highEnergy,

            lowRelative,

            midRelative,

            highRelative,

            persistence,

            profile:

                available
                    ? profile
                    : "unknown",

            analyzedFrames,

            lowActivityFrames
        };
    }


    // ======================================
    // ANALISAR
    // ======================================

    analyzeBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido."
            );
        }


        const sampleRate =
            audioBuffer.sampleRate;


        this.sampleRate =
            sampleRate;


        const mono =
            this.createMonoBuffer(
                audioBuffer
            );


        const rms =
            this.calculateRMS(
                mono
            );


        const peak =
            this.calculatePeak(
                mono
            );


        const rmsDb =
            this.amplitudeToDb(
                rms
            );


        const peakDb =
            this.amplitudeToDb(
                peak
            );


        // ==================================
        // BANDAS
        // ==================================

        const body =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                120,
                500
            );


        const lowMid =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                500,
                1200
            );


        const mid =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                1200,
                2500
            );


        const presence =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                2500,
                5000
            );


        const sibilance =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                5000,
                9500
            );


        const air =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                9500,
                14000
            );


        const total =
            body +
            lowMid +
            mid +
            presence +
            sibilance +
            air +
            0.000001;


        // ==================================
        // PROPORÇÕES
        // ==================================

        const bodyRatio =
            body /
            total;


        const presenceRatio =
            presence /
            total;


        const sibilanceRatio =
            sibilance /
            total;


        const airRatio =
            air /
            total;


        // ==================================
        // ANÁLISE TEMPORAL
        // ==================================

        const sibilanceTimeline =
            this.analyzeSibilanceTimeline(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // ANÁLISE DE RUÍDO
        // ==================================

        const noiseProfile =
            this.analyzeNoiseProfile(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // CARACTERÍSTICAS
        // ==================================

        const hardness =
            this.clamp(
                (
                    presenceRatio *
                    4.5
                ) -
                (
                    bodyRatio *
                    0.8
                ),
                0,
                1
            );


        const roughness =
            this.clamp(
                (
                    presenceRatio *
                    2.5
                ) +
                (
                    sibilanceRatio *
                    2.5
                ) +
                (
                    airRatio *
                    0.8
                ),
                0,
                1
            );


        const spectralSibilance =
            this.clamp(
                sibilanceRatio *
                6,
                0,
                1
            );


        const temporalSibilance =
            sibilanceTimeline
                .temporalScore;


        const sibilanceAmount =
            this.clamp(
                (
                    spectralSibilance *
                    0.60
                ) +
                (
                    temporalSibilance *
                    0.40
                ),
                0,
                1
            );


        const bodyAmount =
            this.clamp(
                (
                    bodyRatio +
                    (
                        lowMid /
                        total
                    )
                ) *
                3,
                0,
                1
            );


        const presenceAmount =
            this.clamp(
                presenceRatio *
                5,
                0,
                1
            );


        // ==================================
        // RESULTADO
        // ==================================

        this.analysis = {

            version:
                "0.5",

            sampleRate,

            channels:
                audioBuffer.numberOfChannels,

            duration:
                audioBuffer.duration,

            rms,

            rmsDb,

            peak,

            peakDb,


            bands: {

                body,

                lowMid,

                mid,

                presence,

                sibilance,

                air
            },


            ratios: {

                body:
                    bodyRatio,

                presence:
                    presenceRatio,

                sibilance:
                    sibilanceRatio,

                air:
                    airRatio
            },


            characteristics: {

                hardness,

                roughness,

                sibilance:
                    sibilanceAmount,

                body:
                    bodyAmount,

                presence:
                    presenceAmount
            },


            sibilanceAnalysis: {

                spectral:
                    spectralSibilance,

                temporal:
                    temporalSibilance,

                amount:
                    sibilanceAmount,

                windowMs:
                    sibilanceTimeline
                        .windowMs,

                hopMs:
                    sibilanceTimeline
                        .hopMs,

                averageEnergy:
                    sibilanceTimeline
                        .averageEnergy,

                peakEnergy:
                    sibilanceTimeline
                        .peakEnergy,

                peakDb:
                    sibilanceTimeline
                        .peakDb,

                activity:
                    sibilanceTimeline
                        .activity,

                peakToAverage:
                    sibilanceTimeline
                        .peakToAverage,

                averageRelative:
                    sibilanceTimeline
                        .averageRelative,

                peakRelative:
                    sibilanceTimeline
                        .peakRelative
            },


            // ==================================
            // PERFIL DE RUÍDO
            // ==================================
            //
            // Somente diagnóstico.
            //
            // Nenhum valor daqui é usado ainda
            // para reduzir o áudio.
            //

            noiseAnalysis: {

                available:
                    noiseProfile.available,

                confidence:
                    noiseProfile.confidence,

                floor:
                    noiseProfile.floor,

                floorDb:
                    noiseProfile.floorDb,

                floorRelative:
                    noiseProfile.floorRelative,

                low:
                    noiseProfile.low,

                mid:
                    noiseProfile.mid,

                high:
                    noiseProfile.high,

                lowRelative:
                    noiseProfile.lowRelative,

                midRelative:
                    noiseProfile.midRelative,

                highRelative:
                    noiseProfile.highRelative,

                persistence:
                    noiseProfile.persistence,

                profile:
                    noiseProfile.profile,

                analyzedFrames:
                    noiseProfile.analyzedFrames,

                lowActivityFrames:
                    noiseProfile.lowActivityFrames
            }
        };


        return this.analysis;
    }


    // ======================================
    // ÚLTIMA ANÁLISE
    // ======================================

    getAnalysis() {

        return this.analysis;
    }
}


// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalAnalyzer =
    VocalAnalyzer;