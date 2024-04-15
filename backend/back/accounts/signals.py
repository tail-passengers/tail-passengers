from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.contrib.sessions.models import Session


@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    # 이전 세션 삭제
    if user and user.session_key:
        Session.objects.filter(session_key=user.session_key).delete()
    # 새 세션 키 저장
    user.session_key = request.session.session_key
    user.save()


@receiver(user_logged_out)
def on_user_logged_out(sender, request, user, **kwargs):
    # 유저가 없는 경우에도 새로고침 하면 로그아웃이 호출 됨
    # user가 None인지 확인할 필요가 있음
    if user and user.session_key:
        # 세션 무효화
        Session.objects.filter(session_key=user.session_key).delete()
        # 세션 키 필드 초기화
        user.session_key = None
        user.save()
