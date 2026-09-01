import asyncio

from browser_use import Agent, ChatGroq


async def main():
    llm = ChatGroq(
        model="openai/gpt-oss-20b",
        temperature=0.0,
        service_tier="on_demand",
    )

    agent = Agent(
        task="Open Google and search for the current weather in Chennai.",
        llm=llm,

        # Reduce Browser Use context
        flash_mode=True,
        use_thinking=False,
        use_vision=False,

        # Reduce history / DOM size
        max_history_items=6,
        max_clickable_elements_length=3000,

        # Keep the agent simple
        max_actions_per_step=1,
        enable_planning=False,
        use_judge=False,
    )

    result = await agent.run()

    print("\n===== RESULT =====")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())