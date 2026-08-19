// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL BALANCER
// V0.1
// ==========================================
//
// Etapa 1:
// ANALISADOR ESPECTRAL
//
// IMPORTANTE:
//
// Este módulo NÃO modifica áudio.
//
// Ele NÃO é um EQ.
//
// Ele NÃO cria 20 processadores.
//
// Ele utiliza uma FFT leve para medir
// aproximadamente 20 regiões espectrais.
//
// Futuramente essas medições poderão
// alimentar:
//
// - Neutral
// - Warm
// - Bright
// - VocalTreatmentPlan
//
// Nesta versão:
//
// - nenhuma correção é aplicada;
// - nenhuma curva é aplicada;
// - nenhum AudioNode é criado;
// - nenhum processamento sonoro é alterado.
//
// Objetivo:
//
// construir uma descrição confiável
// do equilíbrio espectral da gravação
// com baixo custo computacional.
//
// ==========================================


class SpectralBalancer {


    constructor(options = {}) {


        // ==================================
        // CONFIGURAÇÕES PRINCIPAIS
        // ==================================

        this.bandCount =
            options.bandCount ||
            20;


        this.minFrequency =
            options.minFrequency ||
            45;


        this.maxFrequency =
            options.maxFrequency ||
            16000;


        this.fftSize =
            options.fftSize ||
            2048;


        this.hopSize =
            options.hopSize ||
            Math.floor(
                this.fftSize / 2
            );


        this.maxFrames =
            options.maxFrames ||
            180;


        this.minConfidence =
            options.minConfidence ??
            0.15;


        // ==================================
        // ESTADO
        // ==================================

        this.lastAnalysis =
            null;


        // ==================================
        // BANDAS
        // ==================================

        this.bands =
            this.createBands();
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
            !Number.isFinite(
                amplitude
            ) ||
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
    // DB → AMPLITUDE
    // ======================================

    dbToAmplitude(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
    }


    // ======================================
    // CRIAR BANDAS
    // ======================================
    //
    // As bandas são aproximadamente
    // logarítmicas.
    //
    // Não representam 20 EQs.
    //
    // São somente regiões de medição.
    //
    // ======================================

    createBands() {

        const bands = [];


        const min =
            this.minFrequency;


        const max =
            this.maxFrequency;


        for (
            let i = 0;
            i < this.bandCount;
            i++
        ) {

            const startRatio =
                i /
                this.bandCount;


            const endRatio =
                (
                    i + 1
                ) /
                this.bandCount;


            const low =
                min *
                Math.pow(
                    max / min,
                    startRatio
                );


            const high =
                min *
                Math.pow(
                    max / min,
                    endRatio
                );


            const center =
                Math.sqrt(
                    low *
                    high
                );


            bands.push({

                index:
                    i,

                lowFrequency:
                    low,

                highFrequency:
                    high,

                centerFrequency:
                    center
            });
        }


        return bands;
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


        if (
            channels <= 0
        ) {

            return mono;
        }


        const inverseChannels =
            1 /
            channels;


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
                    data[i] *
                    inverseChannels;
            }
        }


        return mono;
    }


    // ======================================
    // JANELA HANN
    // ======================================

    createHannWindow(
        size
    ) {

        const window =
            new Float32Array(
                size
            );


        const denominator =
            Math.max(
                1,
                size - 1
            );


        for (
            let i = 0;
            i < size;
            i++
        ) {

            window[i] =
                0.5 *
                (
                    1 -
                    Math.cos(
                        (
                            2 *
                            Math.PI *
                            i
                        ) /
                        denominator
                    )
                );
        }


        return window;
    }


    // ======================================
    // FFT
    // ======================================
    //
    // FFT iterativa radix-2.
    //
    // Não usa bibliotecas externas.
    //
    // Isso reduz dependências e mantém
    // compatibilidade com o Spck.
    //
    // ======================================

    fft(
        real,
        imag
    ) {

        const n =
            real.length;


        // ----------------------------------
        // BIT REVERSAL
        // ----------------------------------

        let j = 0;


        for (
            let i = 1;
            i < n;
            i++
        ) {

            let bit =
                n >> 1;


            while (
                j & bit
            ) {

                j ^=
                    bit;

                bit >>=
                    1;
            }


            j ^=
                bit;


            if (
                i < j
            ) {

                const realTemp =
                    real[i];


                real[i] =
                    real[j];


                real[j] =
                    realTemp;


                const imagTemp =
                    imag[i];


                imag[i] =
                    imag[j];


                imag[j] =
                    imagTemp;
            }
        }


        // ----------------------------------
        // ESTÁGIOS FFT
        // ----------------------------------

        for (
            let length = 2;
            length <= n;
            length <<= 1
        ) {

            const half =
                length >> 1;


            const angleStep =
                -(
                    2 *
                    Math.PI
                ) /
                length;


            const phaseReal =
                Math.cos(
                    angleStep
                );


            const phaseImag =
                Math.sin(
                    angleStep
                );


            let currentReal =
                1;


            let currentImag =
                0;


            for (
                let i = 0;
                i < half;
                i++
            ) {

                for (
                    let start = i;
                    start < n;
                    start += length
                ) {

                    const even =
                        start;


                    const odd =
                        start +
                        half;


                    const oddReal =
                        real[odd];


                    const oddImag =
                        imag[odd];


                    const transformedReal =
                        (
                            oddReal *
                            currentReal
                        ) -
                        (
                            oddImag *
                            currentImag
                        );


                    const transformedImag =
                        (
                            oddReal *
                            currentImag
                        ) +
                        (
                            oddImag *
                            currentReal
                        );


                    const evenReal =
                        real[even];


                    const evenImag =
                        imag[even];


                    real[even] =
                        evenReal +
                        transformedReal;


                    imag[even] =
                        evenImag +
                        transformedImag;


                    real[odd] =
                        evenReal -
                        transformedReal;


                    imag[odd] =
                        evenImag -
                        transformedImag;
                }


                const nextReal =
                    (
                        currentReal *
                        phaseReal
                    ) -
                    (
                        currentImag *
                        phaseImag
                    );


                const nextImag =
                    (
                        currentReal *
                        phaseImag
                    ) +
                    (
                        currentImag *
                        phaseReal
                    );


                currentReal =
                    nextReal;


                currentImag =
                    nextImag;
            }
        }


        return {
            real,
            imag
        };
    }


    // ======================================
    // VERIFICAR FFT
    // ======================================

    isValidFFTSize(
        size
    ) {

        if (
            !Number.isInteger(
                size
            ) ||
            size < 256
        ) {

            return false;
        }


        return (
            size &
            (
                size - 1
            )
        ) === 0;
    }


    // ======================================
    // AJUSTAR FFT
    // ======================================

    resolveFFTSize() {

        if (
            this.isValidFFTSize(
                this.fftSize
            )
        ) {

            return this.fftSize;
        }


        return 2048;
    }


    // ======================================
    // ENERGIA FFT
    // ======================================

    calculateSpectrum(
        real,
        imag
    ) {

        const size =
            real.length;


        const half =
            Math.floor(
                size / 2
            );


        const spectrum =
            new Float32Array(
                half + 1
            );


        const normalization =
            1 /
            size;


        for (
            let i = 0;
            i <= half;
            i++
        ) {

            const re =
                real[i] *
                normalization;


            const im =
                imag[i] *
                normalization;


            const magnitude =
                Math.sqrt(
                    (
                        re *
                        re
                    ) +
                    (
                        im *
                        im
                    )
                );


            spectrum[i] =
                magnitude;
        }


        return spectrum;
    }


    // ======================================
    // ENERGIA DE BANDA
    // ======================================

    measureBandEnergy(
        spectrum,
        sampleRate,
        fftSize,
        band
    ) {

        const nyquist =
            sampleRate / 2;


        const binWidth =
            sampleRate /
            fftSize;


        const low =
            this.clamp(
                band.lowFrequency,
                0,
                nyquist
            );


        const high =
            this.clamp(
                band.highFrequency,
                0,
                nyquist
            );


        let startBin =
            Math.floor(
                low /
                binWidth
            );


        let endBin =
            Math.ceil(
                high /
                binWidth
            );


        startBin =
            this.clamp(
                startBin,
                0,
                spectrum.length - 1
            );


        endBin =
            this.clamp(
                endBin,
                startBin + 1,
                spectrum.length - 1
            );


        let sum =
            0;


        let count =
            0;


        for (
            let bin = startBin;
            bin <= endBin;
            bin++
        ) {

            const magnitude =
                spectrum[bin];


            sum +=
                magnitude *
                magnitude;


            count++;
        }


        if (
            count <= 0
        ) {

            return 0;
        }


        return Math.sqrt(
            sum /
            count
        );
    }


    // ======================================
    // FRAME FFT
    // ======================================

    analyzeFrame(
        mono,
        start,
        sampleRate,
        fftSize,
        window
    ) {

        const real =
            new Float32Array(
                fftSize
            );


        const imag =
            new Float32Array(
                fftSize
            );


        let frameEnergy =
            0;


        for (
            let i = 0;
            i < fftSize;
            i++
        ) {

            const index =
                start +
                i;


            let sample =
                0;


            if (
                index >= 0 &&
                index < mono.length
            ) {

                sample =
                    mono[index];
            }


            const windowed =
                sample *
                window[i];


            real[i] =
                windowed;


            frameEnergy +=
                windowed *
                windowed;
        }


        const rms =
            Math.sqrt(
                frameEnergy /
                fftSize
            );


        const transformed =
            this.fft(
                real,
                imag
            );


        const spectrum =
            this.calculateSpectrum(
                transformed.real,
                transformed.imag
            );


        const bands =
            new Float32Array(
                this.bandCount
            );


        for (
            let i = 0;
            i < this.bandCount;
            i++
        ) {

            bands[i] =
                this.measureBandEnergy(
                    spectrum,
                    sampleRate,
                    fftSize,
                    this.bands[i]
                );
        }


        return {

            rms,

            bands
        };
    }


    // ======================================
    // CALCULAR ESTATÍSTICA
    // ======================================

    calculateStatistics(
        values
    ) {

        if (
            !values ||
            values.length === 0
        ) {

            return {

                mean:
                    0,

                peak:
                    0,

                min:
                    0,

                variance:
                    0,

                standardDeviation:
                    0
            };
        }


        let sum =
            0;


        let peak =
            0;


        let min =
            Infinity;


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const value =
                values[i];


            sum +=
                value;


            if (
                value >
                peak
            ) {

                peak =
                    value;
            }


            if (
                value <
                min
            ) {

                min =
                    value;
            }
        }


        const mean =
            sum /
            values.length;


        let varianceSum =
            0;


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const difference =
                values[i] -
                mean;


            varianceSum +=
                difference *
                difference;
        }


        const variance =
            varianceSum /
            values.length;


        return {

            mean,

            peak,

            min,

            variance,

            standardDeviation:
                Math.sqrt(
                    variance
                )
        };
    }


    // ======================================
    // ANALISAR
    // ======================================

    analyze(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido para análise espectral."
            );
        }


        const sampleRate =
            audioBuffer.sampleRate ||
            44100;


        const mono =
            this.createMonoBuffer(
                audioBuffer
            );


        if (
            mono.length === 0
        ) {

            return null;
        }


        const fftSize =
            this.resolveFFTSize();


        const hopSize =
            Math.max(
                1,
                Math.min(
                    this.hopSize,
                    fftSize
                )
            );


        const window =
            this.createHannWindow(
                fftSize
            );


        // ----------------------------------
        // POSIÇÕES DAS JANELAS
        // ----------------------------------

        const possibleFrames =
            Math.max(
                1,
                Math.floor(
                    (
                        mono.length -
                        1
                    ) /
                    hopSize
                )
            );


        let frameStep =
            1;


        if (
            possibleFrames >
            this.maxFrames
        ) {

            frameStep =
                Math.ceil(
                    possibleFrames /
                    this.maxFrames
                );
        }


        const bandValues =
            [];


        const frameLoudness =
            [];


        const frameTimes =
            [];


        let analyzedFrames =
            0;


        // ----------------------------------
        // ANÁLISE TEMPORAL
        // ----------------------------------

        for (
            let frameIndex = 0;
            frameIndex < possibleFrames;
            frameIndex += frameStep
        ) {

            const start =
                frameIndex *
                hopSize;


            const frame =
                this.analyzeFrame(
                    mono,
                    start,
                    sampleRate,
                    fftSize,
                    window
                );


            bandValues.push(
                frame.bands
            );


            frameLoudness.push(
                frame.rms
            );


            frameTimes.push(
                start /
                sampleRate
            );


            analyzedFrames++;
        }


        // ----------------------------------
        // LOUDNESS MÉDIO
        // ----------------------------------

        let totalEnergy =
            0;


        for (
            let i = 0;
            i < frameLoudness.length;
            i++
        ) {

            totalEnergy +=
                frameLoudness[i];
        }


        const globalLoudness =
            frameLoudness.length > 0
                ? totalEnergy /
                  frameLoudness.length
                : 0;


        // ----------------------------------
        // ESTATÍSTICAS POR BANDA
        // ----------------------------------

        const bands =
            [];


        let totalBandEnergy =
            0;


        const rawMeanBands =
            new Float32Array(
                this.bandCount
            );


        for (
            let bandIndex = 0;
            bandIndex < this.bandCount;
            bandIndex++
        ) {

            const values =
                new Float32Array(
                    bandValues.length
                );


            for (
                let frame = 0;
                frame < bandValues.length;
                frame++
            ) {

                values[frame] =
                    bandValues[frame][
                        bandIndex
                    ];
            }


            const statistics =
                this.calculateStatistics(
                    values
                );


            rawMeanBands[
                bandIndex
            ] =
                statistics.mean;


            totalBandEnergy +=
                statistics.mean;
        }


        // ----------------------------------
        // PERFIL RELATIVO
        // ----------------------------------

        for (
            let bandIndex = 0;
            bandIndex < this.bandCount;
            bandIndex++
        ) {

            const band =
                this.bands[
                    bandIndex
                ];


            const values =
                new Float32Array(
                    bandValues.length
                );


            for (
                let frame = 0;
                frame < bandValues.length;
                frame++
            ) {

                values[frame] =
                    bandValues[frame][
                        bandIndex
                    ];
            }


            const statistics =
                this.calculateStatistics(
                    values
                );


            const mean =
                statistics.mean;


            const relative =
                globalLoudness > 0
                    ? mean /
                      globalLoudness
                    : 0;


            const spectrumRelative =
                totalBandEnergy > 0
                    ? mean /
                      totalBandEnergy
                    : 0;


            const relativeDb =
                relative > 0
                    ? this.amplitudeToDb(
                        relative
                    )
                    : -120;


            const temporalVariation =
                mean > 0
                    ? this.clamp(
                        statistics.standardDeviation /
                        mean,
                        0,
                        10
                    )
                    : 0;


            const stability =
                this.clamp(
                    1 -
                    (
                        temporalVariation /
                        2
                    ),
                    0,
                    1
                );


            bands.push({

                index:
                    band.index,

                lowFrequency:
                    band.lowFrequency,

                highFrequency:
                    band.highFrequency,

                centerFrequency:
                    band.centerFrequency,

                mean:

                    mean,

                peak:

                    statistics.peak,

                minimum:

                    statistics.min,

                standardDeviation:

                    statistics.standardDeviation,

                relativeToBroadband:

                    relative,

                relativeDb:

                    relativeDb,

                spectrumShare:

                    spectrumRelative,

                temporalVariation:

                    temporalVariation,

                stability:

                    stability
            });
        }


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------
        //
        // Quanto mais frames úteis temos,
        // maior a confiança.
        //
        // Mas nunca transformamos isso
        // automaticamente em correção.
        //
        // ----------------------------------

        const frameConfidence =
            this.clamp(
                analyzedFrames /
                40,
                0,
                1
            );


        const loudnessConfidence =
            globalLoudness >
            0.00001
                ? 1
                : 0;


        let stabilitySum =
            0;


        for (
            let i = 0;
            i < bands.length;
            i++
        ) {

            stabilitySum +=
                bands[i].stability;
        }


        const averageStability =
            bands.length > 0
                ? stabilitySum /
                  bands.length
                : 0;


        const confidence =
            this.clamp(
                (
                    frameConfidence *
                    0.40
                ) +
                (
                    loudnessConfidence *
                    0.20
                ) +
                (
                    averageStability *
                    0.40
                ),
                0,
                1
            );


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        const result = {

            version:
                "0.1",


            mode:
                "analysis-only",


            sampleRate:


                sampleRate,


            fftSize:


                fftSize,


            hopSize:


                hopSize,


            bandCount:


                this.bandCount,


            minFrequency:


                this.minFrequency,


            maxFrequency:


                this.maxFrequency,


            analyzedFrames:


                analyzedFrames,


            globalLoudness:


                globalLoudness,


            globalLoudnessDb:


                this.amplitudeToDb(
                    globalLoudness
                ),


            averageStability:


                averageStability,


            confidence:


                confidence,


            bands:


                bands,


            references:


                {

                    neutral:
                        null,

                    warm:
                        null,

                    bright:
                        null
                },


            processing:


                {

                    applied:
                        false,

                    gainApplied:
                        0
                }
        };


        this.lastAnalysis =
            result;


        return result;
    }


    // ======================================
    // ÚLTIMA ANÁLISE
    // ======================================

    getLastAnalysis() {

        return this.lastAnalysis;
    }


    // ======================================
    // OBTER BANDAS
    // ======================================

    getBands() {

        return this.bands.slice();
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralBalancer =
    SpectralBalancer;