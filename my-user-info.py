from db import crud_user
from mad_hatter.decorators import tool


@tool(return_direct=True)
def get_my_user_information(tool_input, bot):
	"""获取当前登录的用户个人信息。 始终没有输入参数。"""

	print(f"\n==========================={bot.email}===========================\n")
	user = crud_user.get_user_by_email(next(bot.db()), bot.email)
	if not user:
		return "No user information"

	content = f"""您的登录用户信息如下：\n
头像：![头像]({user.avatar} "=60x40")\n
邮箱: {user.email}\n
描述: {user.description}\n
剩余使用次数: {user.total_requests - user.used_requests}\n
是否飞书用户：{user.is_feishu_user}
"""
	return content
