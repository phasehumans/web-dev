import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import TextInput from 'ink-text-input'

import { CustomIndicator, CustomItem } from './menu-items'

export function GrillQuestionMenu(props: any) {
    const {
        grillQuestions,
        currentGrillIndex,
        customInputMode,
        handleGrillSelect,
        customAnswer,
        setCustomAnswer,
        setCustomInputMode,
        grillAnswers,
        setGrillAnswers,
        setCurrentGrillIndex,
        generatePlanFromGrill,
    } = props
    const q = grillQuestions[currentGrillIndex]
    if (q) {
        const items = [
            ...q.options.map((opt, i) => ({ label: `${i + 1}. ${opt}`, value: opt })),
            { label: `${q.options.length + 1}. Write-in...`, value: 'custom' },
        ]
        return (
            <Box flexDirection="column" paddingX={1}>
                <Box marginBottom={1} flexDirection="column">
                    {q.docSource && (
                        <Text color="#7DD3FC" bold>
                            [Doc Grounding: {q.docSource}]
                        </Text>
                    )}
                    <Text color="#89B4F8" bold>
                        Question {currentGrillIndex + 1}/{grillQuestions.length}:
                    </Text>
                    <Text color="white" bold>
                        {q.question}
                    </Text>
                </Box>
                {!customInputMode ? (
                    <>
                        <SelectInput
                            items={items}
                            onSelect={handleGrillSelect}
                            indicatorComponent={CustomIndicator}
                            itemComponent={CustomItem}
                        />
                        <Box paddingTop={1}>
                            <Box gap={1}>
                                <Text color="#89B4F8">↑↓</Text>
                                <Text color="#AAAAAA">Navigate</Text>
                                <Text color="#AAAAAA">·</Text>
                                <Text color="#89B4F8">enter</Text>
                                <Text color="#AAAAAA">Select</Text>
                                <Text color="#AAAAAA">·</Text>
                                <Text color="#89B4F8">esc</Text>
                                <Text color="#AAAAAA">Cancel</Text>
                            </Box>
                        </Box>
                    </>
                ) : (
                    <Box flexDirection="column" gap={1}>
                        <Box flexDirection="row" gap={1}>
                            <Text color="#89B4F8">Your answer:</Text>
                            <TextInput
                                focus={true}
                                value={customAnswer}
                                onChange={setCustomAnswer}
                                onSubmit={(value) => {
                                    const answer = value.trim()
                                    if (answer.length === 0) {
                                        setCustomInputMode(false)
                                        return
                                    }

                                    setCustomInputMode(false)
                                    setCustomAnswer('')

                                    const nextAnswers = [...grillAnswers, answer]
                                    setGrillAnswers(nextAnswers)

                                    if (currentGrillIndex + 1 < grillQuestions.length) {
                                        setCurrentGrillIndex(currentGrillIndex + 1)
                                    } else {
                                        void generatePlanFromGrill(nextAnswers)
                                    }
                                }}
                            />
                        </Box>
                        <Box paddingTop={1}>
                            <Box gap={1}>
                                <Text color="#89B4F8">enter</Text>
                                <Text color="#AAAAAA">Submit</Text>
                                <Text color="#AAAAAA">·</Text>
                                <Text color="#89B4F8">esc</Text>
                                <Text color="#AAAAAA">Cancel</Text>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        )
    }
    return null
}
