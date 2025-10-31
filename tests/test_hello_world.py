from src import hello_world

x = hello_world.say_hello_world()


def test_hello_world_output():
    assert hello_world.say_hello_world() == "Hello, World!"
