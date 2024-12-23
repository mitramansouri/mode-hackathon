import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State
} from "@ai16z/eliza";

export default {
    name: "CREATE_POLL",
    similes: ["START_POLL", "INITIATE_VOTE", "TELEGRAM_POLL"],
    description: "Creates a poll in a Telegram chat with the provided question and options.",

    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => {
        // Validate that the message is from Telegram and contains the necessary information
        if (!message.content || message.content.source !== "telegram") {
            return false;
        }
        // Allow both /poll and /createpoll commands
        if (!message.content.text ||
            !(/^\/(?:create)?poll\b/i.test(message.content.text))) {
            return false;
        }
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            }

            // Extract poll details from the message content
            const pollDetails = message.content.text.split("\n");
            if (pollDetails.length < 3) {
                throw new Error(
                    "Invalid poll format. Please use format:\n/poll\nYour question\nOption 1\nOption 2\n[Option 3...]"
                );
            }

            const question = pollDetails[1].trim();
            const options = pollDetails.slice(2).map((option) => option.trim());

            // Validate poll data
            if (!question || options.length < 2 || options.length > 10) {
                throw new Error(
                    "Poll must have a question and between 2-10 options."
                );
            }

            // Create the response content for Telegram
            const response: Content = {
                text: question,
                source: message.content.source,
                action: "SEND_POLL",
                metadata: {
                    chat_id: message.content.chat_id,
                    question: question,
                    options: options,
                    is_anonymous: true, // You can make this configurable
                    type: 'regular'     // or 'quiz' if you want to support quiz polls
                }
            };

            // Send the poll using the callback
            await callback(response);

        } catch (error) {
            console.error("Error creating poll:", error);

            const errorResponse: Content = {
                text: `Failed to create poll: ${error.message}`,
                action: "CREATE_POLL_ERROR",
                source: message.content.source,
                metadata: {
                    chat_id: message.content.chat_id
                }
            };

            await callback(errorResponse);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "/poll\nWhat is your favorite color?\nRed\nBlue\nGreen",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Creating a poll:\n\n*What is your favorite color?*\n1. Red\n2. Blue\n3. Green",
                    action: "CREATE_POLL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "/poll\nWhich programming language do you prefer?\nJavaScript\nPython\nC++",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Creating a poll:\n\n*Which programming language do you prefer?*\n1. JavaScript\n2. Python\n3. C++",
                    action: "CREATE_POLL",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
