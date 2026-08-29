// ==========================================
// SMOOTHVSTUDIO
// VOCAL NOISE REDUCER
// V0.2
// ==========================================
//
// Primeiro DSP atuante dedicado exclusivamente
// à redução conservadora de ruído.
//
// O módulo recebe:
//
// - AudioBuffer original;
// - noiseProfile produzido pelo Analyzer.
//
// O Analyzer continua responsável por:
//
// - estimar o noise floor;
// - calcular confiança;
// - fornecer evidências espectrais/temporais.
//
// Este módulo é responsável por:
//
// - decidir a ação local;
// - calcular ganho de redução;
// - suavizar a ação;
// - preservar regiões com evidência vocal;
// - manter bypass quando a evidência for insuficiente.
//
// IMPORTANTE:
//
// Esta versão NÃO é um noise gate agressivo.
//
// A redução máxima permanece deliberadamente
// limitada a 3 dB.
//
// ==========================================


class VocalNoiseReducer {


    constructor(
        options = {}
    ) {

        this.version =
            "0.2";


        // ==================================
        // CONFIGURAÇÃO DE SEGURANÇA
        // ==================================

        this.maxReductionDb =
            options.maxReductionDb ??
            3;


        this.minConfidence =
            options.minConfidence ??
            0.60;


        this.minNoiseRatio =
            options.minNoiseRatio ??
            0.025;


        this.protectionAmount =
            options.protectionAmount ??
            0.85;


        this.enabled =
            options.enabled ??
            true;


        // ==================================
        // ANÁLISE LOCAL
        // ==================================

        /*
         * O AnalyzerNoise trabalha com janelas
         * de aproximadamente 20 ms e hop de 10 ms.
         *
         * Mantemos essa escala aqui para que
         * a decisão local permaneça leve e
         * coerente com a análise existente.
         */

        this.analysisWindowMs =
            options.analysisWindowMs ??
            20;

        this.analysisHopMs =
            options.analysisHopMs ??
            10;


        // ==================================
        // LIMITES DE DECISÃO LOCAL
        // ==================================

        /*
         * Abaixo deste multiplicador do floor,
         * a região é forte candidata a ruído.
         */

        this.noiseRegionMultiplier =
            options.noiseRegionMultiplier ??
            1.50;


        /*
         * Acima deste multiplicador,
         * consideramos que há conteúdo suficiente
         * para preservar integralmente.
         */

        this.voiceRegionMultiplier =
            options.voiceRegionMultiplier ??
            4.00;


        // ==================================
        // SUAVIZAÇÃO
        // ==================================

        this.attackTime =
            options.attackTime ??
            0.025;


        this.releaseTime =
            options.releaseTime ??
            0.080;
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
    // DB → LINEAR
    // ======================================

    dbToLinear(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
    }


    // ======================================
    // LINEAR → DB
    // ======================================

    linearToDb(
        value
    ) {

        if (
            value <= 0
        ) {

            return -120;
        }


        return 20 *
            Math.log10(
                value
            );
    }


    // ======================================
    // PERFIL USÁVEL
    // ======================================

    isProfileUsable(
        noiseAnalysis
    ) {

        if (
            !noiseAnalysis
        ) {

            return false;
        }


        if (
            noiseAnalysis.available !==
            true
        ) {

            return false;
        }


        const confidence =
            Number(
                noiseAnalysis.confidence
            ) || 0;


        if (
            confidence <
            this.minConfidence
        ) {

            return false;
        }


        const floorRelative =
            Number(
                noiseAnalysis.floorRelative
            ) || 0;


        if (
            floorRelative <
            this.minNoiseRatio
        ) {

            return false;
        }


        const floor =
            Number(
                noiseAnalysis.floor
            ) || 0;


        if (
            floor <= 0
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // REDUÇÃO GLOBAL PERMITIDA
    // ======================================

    calculateReduction(
        noiseAnalysis
    ) {

        if (
            !this.enabled
        ) {

            return {
                enabled:
                    false,

                reductionDb:
                    0,

                confidence:
                    0
            };
        }


        if (
            !this.isProfileUsable(
                noiseAnalysis
            )
        ) {

            return {
                enabled:
                    false,

                reductionDb:
                    0,

                confidence:
                    noiseAnalysis &&
                    Number(
                        noiseAnalysis.confidence
                    ) || 0
            };
        }


        const confidence =
            this.clamp(
                Number(
                    noiseAnalysis.confidence
                ) || 0,
                0,
                1
            );


        const floorRelative =
            this.clamp(
                Number(
                    noiseAnalysis.floorRelative
                ) || 0,
                0,
                1
            );


        /*
         * Confiança somente acima do limite
         * mínimo pode aumentar a ação.
         */

        const confidenceFactor =
            this.clamp(
                (
                    confidence -
                    this.minConfidence
                ) /
                (
                    1 -
                    this.minConfidence
                ),
                0,
                1
            );


        /*
         * Quanto maior o noise floor relativo,
         * maior a quantidade potencial de redução.
         *
         * Mantemos o ponto de saturação em 15%.
         */

        const noiseFactor =
            this.clamp(
                floorRelative /
                0.15,
                0,
                1
            );


        let reduction =
            this.maxReductionDb *
            confidenceFactor *
            noiseFactor;


        /*
         * Proteção global.
         *
         * A proteção nunca elimina completamente
         * a possibilidade de ação, mas reduz
         * a agressividade máxima.
         */

        const protectionFactor =
            this.clamp(
                1 -
                (
                    this.protectionAmount *
                    0.35
                ),
                0.55,
                1
            );


        reduction *=
            protectionFactor;


        reduction =
            this.clamp(
                reduction,
                0,
                this.maxReductionDb
            );


        return {

            enabled:
                reduction > 0,

            reductionDb:
                reduction,

            confidence,

            floor:
                Number(
                    noiseAnalysis.floor
                ) || 0,

            floorRelative,

            protection:
                this.protectionAmount
        };
    }


    // ======================================
    // CONFIGURAÇÃO
    // ======================================

    getSettings(
        noiseAnalysis
    ) {

        const reduction =
            this.calculateReduction(
                noiseAnalysis
            );


        return {

            version:
                this.version,

            enabled:
                reduction.enabled,

            reductionDb:
                reduction.reductionDb,

            confidence:
                reduction.confidence,

            floor:
                reduction.floor,

            floorRelative:
                reduction.floorRelative,

            protection:
                this.protectionAmount,

            maxReductionDb:
                this.maxReductionDb,

            analysisWindowMs:
                this.analysisWindowMs,

            analysisHopMs:
                this.analysisHopMs,

            noiseRegionMultiplier:
                this.noiseRegionMultiplier,

            voiceRegionMultiplier:
                this.voiceRegionMultiplier,

            attackTime:
                this.attackTime,

            releaseTime:
                this.releaseTime
        };
    }


    // ======================================
    // RMS LOCAL
    // ======================================

    getLocalRms(
        audioBuffer,
        startSample,
        endSample
    ) {

        if (
            !audioBuffer ||
            audioBuffer.numberOfChannels <= 0
        ) {

            return 0;
        }


        const channels =
            audioBuffer.numberOfChannels;


        const length =
            Math.max(
                1,
                endSample -
                startSample
            );


        let sumSquares =
            0;


        let count =
            0;


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            const safeStart =
                Math.max(
                    0,
                    startSample
                );


            const safeEnd =
                Math.min(
                    data.length,
                    endSample
                );


            for (
                let i = safeStart;
                i < safeEnd;
                i++
            ) {

                const sample =
                    data[i];


                sumSquares +=
                    sample *
                    sample;


                count++;
            }
        }


        if (
            count <= 0
        ) {

            return 0;
        }


        return Math.sqrt(
            sumSquares /
            count
        );
    }


    // ======================================
    // CALCULAR GANHO LOCAL
    // ======================================

    calculateLocalGain(
        localRms,
        noiseFloor,
        maximumReductionDb
    ) {

        if (
            noiseFloor <= 0 ||
            maximumReductionDb <= 0
        ) {

            return 1;
        }


        if (
            localRms <= 0
        ) {

            /*
             * Silêncio digital absoluto não precisa
             * ser amplificado.
             *
             * Mantemos o ganho calculável,
             * mas nunca abaixo do ganho de redução
             * máximo permitido.
             */

            return this.dbToLinear(
                -maximumReductionDb
            );
        }


        const noiseThreshold =
            noiseFloor *
            this.noiseRegionMultiplier;


        const voiceThreshold =
            noiseFloor *
            this.voiceRegionMultiplier;


        /*
         * Região claramente acima do floor:
         * preservação total.
         */

        if (
            localRms >=
            voiceThreshold
        ) {

            return 1;
        }


        /*
         * Região claramente próxima do floor:
         * ação máxima permitida.
         */

        if (
            localRms <=
            noiseThreshold
        ) {

            return this.dbToLinear(
                -maximumReductionDb
            );
        }


        /*
         * Região intermediária:
         * interpolação progressiva.
         */

        const position =
            this.clamp(
                (
                    localRms -
                    noiseThreshold
                ) /
                (
                    voiceThreshold -
                    noiseThreshold
                ),
                0,
                1
            );


        /*
         * Curva suave para evitar uma transição
         * excessivamente agressiva.
         */

        const smoothPosition =
            position *
            position *
            (
                3 -
                (
                    2 *
                    position
                )
            );


        const reductionDb =
            maximumReductionDb *
            (
                1 -
                smoothPosition
            );


        return this.dbToLinear(
            -reductionDb
        );
    }


    // ======================================
    // CRIAR PROCESSADOR WEB AUDIO
    // ======================================

    createProcessor(
        context,
        noiseAnalysis,
        audioBuffer
    ) {

        if (
            !context ||
            typeof context.createGain !==
            "function"
        ) {

            throw new Error(
                "OfflineAudioContext inválido para VocalNoiseReducer."
            );
        }


        const gainNode =
            context.createGain();


        const settings =
            this.getSettings(
                noiseAnalysis
            );


        /*
         * Sem evidência suficiente:
         *
         * o Noise permanece totalmente
         * transparente.
         */

        if (
            !audioBuffer ||
            !settings.enabled ||
            settings.reductionDb <= 0
        ) {

            gainNode.gain.setValueAtTime(
                1,
                0
            );


            return {

                input:
                    gainNode,

                output:
                    gainNode,

                processor:
                    gainNode,

                settings
            };
        }


        const sampleRate =
            audioBuffer.sampleRate ||
            context.sampleRate;


        const windowSamples =
            Math.max(
                1,
                Math.round(
                    sampleRate *
                    (
                        this.analysisWindowMs /
                        1000
                    )
                )
            );


        const hopSamples =
            Math.max(
                1,
                Math.round(
                    sampleRate *
                    (
                        this.analysisHopMs /
                        1000
                    )
                )
            );


        const duration =
            audioBuffer.length /
            sampleRate;


        /*
         * Garante um valor inicial conhecido.
         */

        gainNode.gain.setValueAtTime(
            1,
            0
        );


        /*
         * Calculamos a curva localmente a partir
         * do AudioBuffer original.
         *
         * Isso acontece uma única vez por execução,
         * não durante reprodução em tempo real.
         *
         * Portanto, o custo é adequado ao
         * processamento offline do SmoothVStudio.
         */

        let previousGain =
            1;


        let frameIndex =
            0;


        for (
            let startSample = 0;
            startSample < audioBuffer.length;
            startSample += hopSamples
        ) {

            const endSample =
                Math.min(
                    audioBuffer.length,
                    startSample +
                    windowSamples
                );


            const localRms =
                this.getLocalRms(
                    audioBuffer,
                    startSample,
                    endSample
                );


            const targetGain =
                this.calculateLocalGain(
                    localRms,
                    settings.floor,
                    settings.reductionDb
                );


            const time =
                Math.min(
                    duration,
                    startSample /
                    sampleRate
                );


            /*
             * No primeiro frame, definimos
             * diretamente o ganho inicial.
             */

            if (
                frameIndex === 0
            ) {

                gainNode.gain
                    .setValueAtTime(
                        targetGain,
                        time
                    );

            } else {

                /*
                 * A transição é suavizada.
                 *
                 * Ganho subindo:
                 * release mais lento.
                 *
                 * Ganho descendo:
                 * attack curto, mas não instantâneo.
                 */

                const transition =
                    targetGain >
                    previousGain
                        ? this.releaseTime
                        : this.attackTime;


                const rampTime =
                    Math.min(
                        transition,
                        Math.max(
                            0.001,
                            this.analysisHopMs /
                            1000
                        )
                    );


                const rampEnd =
                    Math.min(
                        duration,
                        time +
                        rampTime
                    );


                gainNode.gain
                    .setValueAtTime(
                        previousGain,
                        time
                    );


                gainNode.gain
                    .linearRampToValueAtTime(
                        targetGain,
                        rampEnd
                    );
            }


            previousGain =
                targetGain;


            frameIndex++;
        }


        /*
         * Garante retorno ao ganho neutro
         * no final do buffer.
         *
         * Isso evita deixar uma automação
         * de redução pendurada além do áudio.
         */

        gainNode.gain
            .setValueAtTime(
                previousGain,
                duration
            );


        return {

            input:
                gainNode,

            output:
                gainNode,

            processor:
                gainNode,

            settings
        };
    }


    // ======================================
    // PROCESSAMENTO DIRETO
    // ======================================
    //
    // Mantido para compatibilidade.
    //
    // A cadeia principal usa createProcessor()
    // porque o SmoothVStudio trabalha com
    // OfflineAudioContext.
    //
    // ======================================

    process(
        audioBuffer,
        noiseAnalysis
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido."
            );
        }


        const settings =
            this.getSettings(
                noiseAnalysis
            );


        /*
         * A execução efetiva ocorre através
         * de createProcessor().
         *
         * Esta função preserva o contrato
         * legado e não tenta criar um
         * segundo caminho de processamento.
         */

        return {

            buffer:
                audioBuffer,

            settings,

            changed:
                false
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalNoiseReducer =
    VocalNoiseReducer;