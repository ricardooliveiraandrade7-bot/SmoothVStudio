"use strict";


class AirReverb {

    constructor(options = {}) {

        this.options = {

            enabled: true,

            /*
             * =====================================================
             * AMBIENTE
             * =====================================================
             */

            position: "central-close",

            canopyHeight: "low",

            canopyMaterial: "soft",

            galleryDamping: true,


            /*
             * =====================================================
             * TEMPO
             * =====================================================
             */

            decayTime: 0.95,

            preDelayMs: 30,


            /*
             * =====================================================
             * REFLEXÕES
             * =====================================================
             */

            earlyReflectionsDb: -3.5,

            tailLevelDb: -6,

            diffusion: 0.65,

            density: 0.50,


            /*
             * =====================================================
             * ALTA FREQUÊNCIA
             * =====================================================
             */

            highFrequencyDamping: 0.75,

            highRolloffHz: 6000,

            highPassHz: 250,

            highShelfHz: 8000,

            highShelfGainDb: -2,


            /*
             * =====================================================
             * MISTURA
             * =====================================================
             */

            mix: 0.15,

            amount: 1.0,


            ...options
        };
    }


    /*
     * =========================================================
     * PROCESSAMENTO PRINCIPAL
     * =========================================================
     */

    process(audioBuffer) {

        this.validateAudioBuffer(audioBuffer);


        if (!this.options.enabled) {

            return audioBuffer;
        }


        const sampleRate =
            audioBuffer.sampleRate;


        const numberOfChannels =
            audioBuffer.numberOfChannels;


        const mix =
            this.clamp(
                this.options.mix,
                0,
                1
            );


        const amount =
            this.clamp(
                this.options.amount,
                0,
                1
            );


        if (
            mix <= 0 ||
            amount <= 0
        ) {

            return audioBuffer;
        }


        for (
            let channel = 0;
            channel < numberOfChannels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            this.processChannel(
                data,
                sampleRate,
                mix,
                amount
            );
        }


        return audioBuffer;
    }


    /*
     * =========================================================
     * CANAL
     * =========================================================
     */

    processChannel(
        data,
        sampleRate,
        mix,
        amount
    ) {

        const length =
            data.length;


        const original =
            new Float32Array(
                data
            );


        /*
         * -----------------------------------------------------
         * PRE-DELAY
         * -----------------------------------------------------
         */

        const preDelaySamples =
            Math.max(
                1,
                Math.round(
                    this.options.preDelayMs *
                    sampleRate /
                    1000
                )
            );


        /*
         * -----------------------------------------------------
         * REVERB BUFFERS
         * -----------------------------------------------------
         */

        const preDelayBuffer =
            new Float32Array(
                length
            );


        /*
         * Pequenas reflexões iniciais.
         *
         * Os tempos são deliberadamente curtos
         * para manter a sensação de ambiente próximo.
         */

        const earlyDelays = [
            0.011,
            0.017,
            0.023,
            0.031
        ];


        const earlyGains = [
            0.42,
            0.34,
            0.27,
            0.21
        ];


        /*
         * -----------------------------------------------------
         * EARLY REFLECTIONS
         * -----------------------------------------------------
         */

        const earlyBuffer =
            new Float32Array(
                length
            );


        const earlyLevel =
            this.dbToLinear(
                this.options.earlyReflectionsDb
            );


        for (
            let i = 0;
            i < length;
            i++
        ) {

            let value = 0;


            for (
                let d = 0;
                d < earlyDelays.length;
                d++
            ) {

                const delaySamples =
                    Math.max(
                        1,
                        Math.round(
                            earlyDelays[d] *
                            sampleRate
                        )
                    );


                const sourceIndex =
                    i -
                    delaySamples;


                if (
                    sourceIndex < 0
                ) {

                    continue;
                }


                value +=
                    original[sourceIndex] *
                    earlyGains[d];
            }


            earlyBuffer[i] =
                value *
                earlyLevel;
        }


        /*
         * -----------------------------------------------------
         * PRE-DELAY
         * -----------------------------------------------------
         */

        for (
            let i = preDelaySamples;
            i < length;
            i++
        ) {

            preDelayBuffer[i] =
                original[
                    i -
                    preDelaySamples
                ];
        }


/*

* ---
* DIFUSÃO + DENSE LATE REVERB
* ---

*/

const diffusion =
this.clamp(
this.options.diffusion,
0,
1
);

const density =
this.clamp(
this.options.density,
0,
1
);

/*

* Quatro linhas com tempos diferentes.
* 
* Os tempos são deliberadamente não uniformes
* para reduzir padrões periódicos e aumentar
* a densidade perceptual da cauda.
  */

const tailDelays = [

Math.max(
    1,
    Math.round(
        0.0297 *
        sampleRate
    )
),

Math.max(
    1,
    Math.round(
        0.0371 *
        sampleRate
    )
),

Math.max(
    1,
    Math.round(
        0.0437 *
        sampleRate
    )
),

Math.max(
    1,
    Math.round(
        0.0503 *
        sampleRate
    )
)

];

const delayBuffers =
tailDelays.map(
delay =>
new Float32Array(
delay
)
);

const delayPositions =
new Array(
delayBuffers.length
).fill(0);

const decayTime =
this.clamp(
this.options.decayTime,
0.1,
3.0
);

/*

* Ganho aproximado para a região de RT60.
  */

const feedback =
Math.pow(
10,
-3 *
(
tailDelays.reduce(
(a, b) => a + b,
0
) /
tailDelays.length
) /
sampleRate /
decayTime
);

const safeFeedback =
this.clamp(
feedback,
0.15,
0.88
);

const tail =
new Float32Array(
length
);

/*

* ---
* CAUDA DENSA
* ---

*/

for (
let i = 0;
i < length;
i++
) {

/*
 * A densidade agora controla a energia
 * injetada na rede de reverberação.
 *
 * Não é mais apenas um "volume da cauda".
 */

const input =
    preDelayBuffer[i] *
    (
        0.35 +
        density * 0.65
    );


/*
 * -------------------------------------------------
 * LEITURA DAS QUATRO LINHAS
 * -------------------------------------------------
 */

const delayed = [

    delayBuffers[0][
        delayPositions[0]
    ],

    delayBuffers[1][
        delayPositions[1]
    ],

    delayBuffers[2][
        delayPositions[2]
    ],

    delayBuffers[3][
        delayPositions[3]
    ]
];


/*
 * -------------------------------------------------
 * MATRIZ DE MISTURA
 * -------------------------------------------------
 *
 * Mistura cruzada entre as quatro linhas.
 *
 * Isso evita que cada delay fique
 * preso ao próprio feedback.
 *
 * A estrutura é uma transformação
 * do tipo Hadamard, útil para espalhar
 * energia entre as linhas sem criar
 * ganho artificial na rede.
 */

const mixed = [

    (
        delayed[0] +
        delayed[1] +
        delayed[2] +
        delayed[3]
    ) * 0.5,

    (
        delayed[0] -
        delayed[1] +
        delayed[2] -
        delayed[3]
    ) * 0.5,

    (
        delayed[0] +
        delayed[1] -
        delayed[2] -
        delayed[3]
    ) * 0.5,

    (
        delayed[0] -
        delayed[1] -
        delayed[2] +
        delayed[3]
    ) * 0.5
];


/*
 * -------------------------------------------------
 * FEEDBACK CROSS-COUPLED
 * -------------------------------------------------
 */

for (
    let d = 0;
    d < delayBuffers.length;
    d++
) {

    const position =
        delayPositions[d];


    /*
     * Mistura entre o próprio delay e
     * as outras linhas.
     *
     * diffusion = 0
     * → comportamento mais individual.
     *
     * diffusion = 1
     * → maior espalhamento entre linhas.
     */

    const feedbackSignal =
        (
            delayed[d] *
            (
                1 -
                diffusion
            )
        ) +
        (
            mixed[d] *
            diffusion
        );


    delayBuffers[d][position] =
        input +
        feedbackSignal *
        safeFeedback;


    let nextPosition =
        position + 1;


    if (
        nextPosition >=
        delayBuffers[d].length
    ) {

        nextPosition = 0;
    }


    delayPositions[d] =
        nextPosition;
}


/*
 * Saída inicial da rede.
 */

tail[i] =
    (
        delayed[0] +
        delayed[1] +
        delayed[2] +
        delayed[3]
    ) *
    0.25;

}

/*

* ---
* DIFUSÃO FINAL
* ---
* 
* Dois all-pass curtos aumentam a densidade
* temporal da cauda antes do damping.
  */

this.applyAllpassDiffusion(
tail,
sampleRate,
0.0017,
0.32 +
diffusion * 0.22
);

this.applyAllpassDiffusion(
tail,
sampleRate,
0.0023,
0.28 +
diffusion * 0.20
);


        /*
         * -----------------------------------------------------
         * DAMPING DE ALTA FREQUÊNCIA
         * -----------------------------------------------------
         */

        this.applyHighFrequencyDamping(
            tail,
            sampleRate
        );


        /*
         * -----------------------------------------------------
         * HPF DO RETORNO
         * -----------------------------------------------------
         */

        this.applyHighPass(
            tail,
            sampleRate,
            this.options.highPassHz
        );


        /*
         * -----------------------------------------------------
         * HIGH SHELF
         * -----------------------------------------------------
         */

        this.applyHighShelf(
            tail,
            sampleRate,
            this.options.highShelfHz,
            this.options.highShelfGainDb
        );


        /*
         * -----------------------------------------------------
         * NÍVEL DA CAUDA
         * -----------------------------------------------------
         */

        const tailGain =
            this.dbToLinear(
                this.options.tailLevelDb
            );


        /*
         * -----------------------------------------------------
         * MIX FINAL
         * -----------------------------------------------------
         */

        for (
            let i = 0;
            i < length;
            i++
        ) {

            const early =
                earlyBuffer[i];


            const late =
                tail[i] *
                tailGain;


            const reverb =
                (
                    early +
                    late
                ) *
                amount;


            data[i] =
                original[i] +
                (
                    reverb -
                    original[i]
                ) *
                mix;
        }
    }

/*

* =========================================================
* ALL-PASS DIFFUSION
* =========================================================
* 
* Aumenta a densidade temporal da cauda
* sem funcionar como um simples eco adicional.
  */

applyAllpassDiffusion(
data,
sampleRate,
delaySeconds,
gain
) {

const safeGain =
    this.clamp(
        gain,
        0.05,
        0.70
    );


const delaySamples =
    Math.max(
        1,
        Math.round(
            delaySeconds *
            sampleRate
        )
    );


const buffer =
    new Float32Array(
        delaySamples
    );


let position = 0;


for (
    let i = 0;
    i < data.length;
    i++
) {

    const input =
        data[i];


    const delayed =
        buffer[position];


    /*
     * Schroeder-style all-pass:
     *
     * y[n] =
     * -g*x[n]
     * + delayed
     * + g*y[n-M]
     */

    const output =
        (
            -safeGain *
            input
        ) +
        delayed;


    buffer[position] =
        input +
        (
            safeGain *
            output
        );


    position++;


    if (
        position >=
        buffer.length
    ) {

        position = 0;
    }


    data[i] =
        Number.isFinite(
            output
        )
            ? output
            : input;
}

}

    /*
     * =========================================================
     * HIGH FREQUENCY DAMPING
     * =========================================================
     */

    applyHighFrequencyDamping(
        data,
        sampleRate
    ) {

        const damping =
            this.clamp(
                this.options.highFrequencyDamping,
                0,
                1
            );


        if (
            damping <= 0
        ) {

            return;
        }


        const cutoff =
            this.clamp(
                this.options.highRolloffHz,
                1000,
                sampleRate * 0.45
            );


        const alpha =
            Math.exp(
                -2 *
                Math.PI *
                cutoff /
                sampleRate
            );


        let previousInput = 0;
        let previousOutput = 0;


        const dampingAmount =
            damping *
            0.75;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const low =
                (
                    1 -
                    alpha
                ) *
                input +
                alpha *
                previousOutput;


            const high =
                input -
                low;


            data[i] =
                low +
                high *
                (
                    1 -
                    dampingAmount
                );


            previousInput =
                input;


            previousOutput =
                low;
        }
    }


    /*
     * =========================================================
     * HIGH-PASS
     * =========================================================
     */

    applyHighPass(
        data,
        sampleRate,
        frequency
    ) {

        const cutoff =
            this.clamp(
                frequency,
                20,
                sampleRate * 0.45
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
            rc /
            (
                rc +
                dt
            );


        let previousInput = 0;
        let previousOutput = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const output =
                alpha *
                (
                    previousOutput +
                    input -
                    previousInput
                );


            data[i] =
                output;


            previousInput =
                input;


            previousOutput =
                output;
        }
    }


    /*
     * =========================================================
     * HIGH SHELF SIMPLIFICADO
     * =========================================================
     */

    applyHighShelf(
        data,
        sampleRate,
        frequency,
        gainDb
    ) {

        const gain =
            this.dbToLinear(
                gainDb
            );


        if (
            Math.abs(
                gainDb
            ) <
            0.001
        ) {

            return;
        }


        const cutoff =
            this.clamp(
                frequency,
                1000,
                sampleRate * 0.45
            );


        const alpha =
            Math.exp(
                -2 *
                Math.PI *
                cutoff /
                sampleRate
            );


        let low =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            low =
                (
                    1 -
                    alpha
                ) *
                input +
                alpha *
                low;


            const high =
                input -
                low;


            data[i] =
                low +
                high *
                gain;
        }
    }


    /*
     * =========================================================
     * UTILITÁRIOS
     * =========================================================
     */

    dbToLinear(db) {

        return Math.pow(
            10,
            db / 20
        );
    }


    clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );
    }


    validateAudioBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer ||
            typeof audioBuffer.numberOfChannels !==
            "number" ||
            typeof audioBuffer.length !==
            "number" ||
            typeof audioBuffer.sampleRate !==
            "number"
        ) {

            throw new Error(
                "Buffer de áudio inválido para o Air Reverb."
            );
        }


        if (
            audioBuffer.numberOfChannels <= 0 ||
            audioBuffer.length <= 0 ||
            audioBuffer.sampleRate <= 0
        ) {

            throw new Error(
                "Estrutura de áudio inválida para o Air Reverb."
            );
        }
    }
}


window.AirReverb =
    AirReverb;