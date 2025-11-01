from agents import Agent, Runner
from agents.extensions.models.litellm_model import LitellmModel

agent = Agent(
    name="Bedrock Assistant",
    instructions=("You are a helpful banking assistant that analyzes and summarizes "
                  "customer transaction data clearly and concisely."),
    model=LitellmModel(
        # alege unul din cele două:
        model="bedrock/amazon.titan-text-lite-v1",        # ieftin, bun pentru teste
        #model="bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0",
    ),
)

async def ask_bedrock(prompt: str):
    result = await Runner.run(agent, prompt)
    return result.final_output
