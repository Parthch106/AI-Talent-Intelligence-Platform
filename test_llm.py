import os
os.environ['OPENAI_API_KEY'] = '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'
os.environ['OPENAI_BASE_URL'] = 'https://models.inference.ai.azure.com'

from langchain_openai import ChatOpenAI

print("Creating LLM...")
llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.1)
print("Invoking LLM...")
result = llm.invoke("Say hi")
print(f"Result: {result.content}")
