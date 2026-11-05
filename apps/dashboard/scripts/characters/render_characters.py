"""
Renders the office crew as small 3D chibi characters with Blender, one PNG per pose.

These are original characters built from simple shapes: a big round head with large eyes, a soft body
in the member's team colours, and a hair style from characters.json. No costumes, logos or likenesses
from any film or comic are modelled.

Run (from the repo root):
  blender -b -P apps/dashboard/scripts/characters/render_characters.py -- \
      --looks apps/dashboard/src/lib/characters.json \
      --out apps/dashboard/public/characters \
      [--ids hulk,maria-hill] [--size 192]

Writes <out>/<id>/<pose>.png for every pose and <out>/manifest.json listing what was rendered.
"""

import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

POSES = ["stand", "walk-a", "walk-b", "type", "sleep"]
HEAD_Z = 1.55
HEAD_R = 0.62


# ---------- helpers ----------

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(hex_color, alpha=1.0):
    h = hex_color.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (alpha,)


_materials = {}


def material(name, color, roughness=0.55, metallic=0.0, emission=None, strength=0.0):
    key = (name, color, roughness, metallic, emission)
    if key in _materials:
        return _materials[key]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = rgba(emission)
        bsdf.inputs["Emission Strength"].default_value = strength
    _materials[key] = mat
    return mat


def outline_material():
    if "outline" in _materials:
        return _materials["outline"]
    mat = bpy.data.materials.new("outline")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.02, 0.02, 0.03, 1)
    mat.node_tree.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    mat.use_backface_culling = True
    _materials["outline"] = mat
    return mat


def finish(obj, mat, outline=0.025, smooth=True, subsurf=1):
    """Assigns the material, smooths the surface and adds an inverted-hull cartoon outline."""
    obj.data.materials.append(mat)
    obj.data.materials.append(outline_material())
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if subsurf:
        mod = obj.modifiers.new("smooth", "SUBSURF")
        mod.levels = subsurf
        mod.render_levels = subsurf
    if outline:
        sol = obj.modifiers.new("outline", "SOLIDIFY")
        sol.thickness = outline
        sol.offset = 1.0
        sol.use_flip_normals = True
        sol.material_offset = 1
    return obj


def sphere(name, loc, scale, mat, outline=0.025, segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, mat, outline)


def capsule(name, start, end, radius, mat, outline=0.02):
    """A rounded limb from start to end."""
    a, b = Vector(start), Vector(end)
    length = (b - a).length
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=length, location=(a + b) / 2)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (b - a).to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(rotation=True)
    finish(obj, mat, outline, subsurf=0)
    for end_point in (a, b):
        sphere(f"{name}-cap", tuple(end_point), (radius, radius, radius), mat, outline, segments=16)
    return obj


def cut_sphere(name, loc, radius, scale, mat, keep, outline=0.025):
    """A sphere with some vertices removed, for hair caps and helmets. keep(v) gets local coordinates."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=radius, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    sol = obj.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.04
    return finish(obj, mat, outline)


# ---------- the character ----------

def build(look, pose):
    skin = material("skin", look["skin"], 0.6)
    hair = material("hair", look["hair"], 0.45)
    top = material("top", look["top"], 0.6)
    bottom = material("bottom", look["bottom"], 0.7)
    accent = material("accent", look["accent"], 0.5)
    eye = material("eye", "#15121a", 0.2)
    shine = material("shine", "#ffffff", 0.1, emission="#ffffff", strength=2.0)
    cheek = material("cheek", "#f08a8a", 0.8)

    walking = pose in ("walk-a", "walk-b")
    swing = 0.18 if pose == "walk-a" else -0.18 if pose == "walk-b" else 0.0

    # Legs and shoes
    for side in (-1, 1):
        step = swing * side
        capsule(f"leg{side}", (0.15 * side, step * 0.5, 0.42), (0.15 * side, step, 0.16), 0.12, bottom)
        sphere(f"shoe{side}", (0.15 * side, step - 0.06, 0.08), (0.15, 0.2, 0.09), accent, segments=20)

    # Body: a soft rounded torso with a belt and collar in the accent colour
    sphere("body", (0, 0, 0.72), (0.36, 0.3, 0.36), top)
    sphere("belt", (0, 0, 0.5), (0.33, 0.27, 0.06), accent, outline=0.015, segments=24)
    sphere("collar", (0, -0.02, 0.98), (0.2, 0.17, 0.06), accent, outline=0.012, segments=24)

    # Arms: hanging, swinging, or reaching forward to type
    for side in (-1, 1):
        shoulder = (0.37 * side, 0, 0.9)
        if pose == "type":
            hand = (0.24 * side, -0.48, 0.66)
        elif walking:
            hand = (0.44 * side, -swing * side * 1.2, 0.52)
        else:
            hand = (0.46 * side, 0, 0.5)
        capsule(f"arm{side}", shoulder, hand, 0.095, top)
        sphere(f"hand{side}", hand, (0.1, 0.1, 0.1), skin, segments=16)

    # Cape or scarf behind the body
    if look.get("cape"):
        cape = material("cape", look["cape"], 0.7)
        sphere("cape", (0, 0.2, 0.62), (0.4, 0.08, 0.42), cape)

    # Head
    tilt = 0.12 if pose == "sleep" else 0.0
    head_z = HEAD_Z - (0.03 if pose == "sleep" else 0)
    sphere("head", (0, 0, head_z), (HEAD_R, HEAD_R * 0.95, HEAD_R * 0.92), skin)
    for side in (-1, 1):
        sphere(f"ear{side}", (HEAD_R * 0.98 * side, 0.02, head_z - 0.02), (0.08, 0.06, 0.1), skin, segments=16)

    # Face: big eyes with a shine, small mouth, rosy cheeks
    style = look["hairStyle"]
    covered = style in ("hood", "helmet")
    if look.get("visor") or covered:
        visor = material("visor", look.get("visor") or "#9cc7ff", 0.15, emission=look.get("visor") or "#9cc7ff", strength=1.5)
        sphere("visor", (0, -HEAD_R * 0.86, head_z - 0.02), (0.42, 0.06, 0.1), visor, outline=0.012)
    else:
        for side in (-1, 1):
            ex = 0.2 * side
            if pose == "sleep":
                sphere(f"eye{side}", (ex, -HEAD_R * 0.9, head_z - 0.06), (0.1, 0.03, 0.02), eye, outline=0)
            else:
                sphere(f"eye{side}", (ex, -HEAD_R * 0.86, head_z - 0.02), (0.11, 0.05, 0.15), eye, outline=0)
                sphere(f"shine{side}", (ex + 0.035, -HEAD_R * 0.93, head_z + 0.05), (0.035, 0.02, 0.04), shine, outline=0, segments=12)
            sphere(f"cheek{side}", (0.33 * side, -HEAD_R * 0.78, head_z - 0.17), (0.07, 0.02, 0.045), cheek, outline=0, segments=12)
        sphere("mouth", (0, -HEAD_R * 0.9, head_z - 0.22), (0.05, 0.02, 0.022), eye, outline=0, segments=12)

    # Hair
    hz = head_z
    if style in ("short", "spiky", "long", "bun", "mohawk"):
        # A cap over the top and back of the head, with a fringe above the eyes.
        def keep_cap(v):
            # Front: stop at the forehead so the eyes show. Back and sides: come down over the ears.
            if v.y < -0.2:
                return v.z > hz + 0.24
            return v.z > hz + 0.05 or (v.y > 0.05 and v.z > hz - 0.35)

        if style != "mohawk":
            cut_sphere("hair", (0, 0, hz), HEAD_R * 1.07, (1, 1, 0.98), hair, keep_cap)
    if style == "spiky":
        # A crown of tufts pointing up and outwards, big enough to read from the front.
        for i in range(7):
            a = -1.2 + i * 0.4
            base = Vector((math.sin(a) * 0.42, -0.05 + abs(a) * 0.1, hz + 0.48 + math.cos(a) * 0.08))
            bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.17, depth=0.42, location=base)
            cone = bpy.context.active_object
            cone.rotation_euler = (0.25, a * 0.7, 0)
            finish(cone, hair, 0.02, subsurf=0)
    elif style == "long":
        sphere("hair-back", (0, 0.32, hz - 0.35), (0.6, 0.22, 0.55), hair)
    elif style == "bun":
        sphere("bun", (0, 0.25, hz + 0.62), (0.2, 0.2, 0.2), hair)
    elif style == "mohawk":
        sphere("mohawk", (0, 0.05, hz + 0.55), (0.1, 0.45, 0.2), hair)
    elif style == "leafy":
        for i, (x, z) in enumerate([(-0.3, 0.45), (0, 0.6), (0.3, 0.45), (0.15, 0.7)]):
            sphere(f"leaf{i}", (x, 0.05, hz + z), (0.2, 0.2, 0.16), hair, segments=16)
    elif covered:
        # Helmet or hood: covers the head except a band at the face for the visor.
        def keep_helmet(v):
            return not (v.y < -0.15 and hz - 0.2 < v.z < hz + 0.12)

        cut_sphere("helmet", (0, 0, hz), HEAD_R * 1.06, (1, 1, 0.98), hair, keep_helmet)

    # Lean the head forward a little when asleep, pivoting at the neck. Meshes only: the camera and
    # lights also sit above the neck and must not move.
    if tilt:
        neck = Vector((0, 0, 1.0))
        turn = Matrix.Rotation(tilt, 4, "X")
        for obj in bpy.context.scene.objects:
            if obj.type == "MESH" and obj.location.z > neck.z:
                obj.matrix_world = Matrix.Translation(neck) @ turn @ Matrix.Translation(-neck) @ obj.matrix_world

    scale = look.get("scale", 1.0)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.location = obj.location * scale
            obj.scale = obj.scale * scale


# ---------- scene ----------

def reset_scene(size):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _materials.clear()
    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.film_transparent = True
    scene.render.resolution_x = size
    scene.render.resolution_y = int(size * 1.25)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    try:
        scene.eevee.taa_render_samples = 32
    except AttributeError:
        pass

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.35, 0.37, 0.45, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    scene.world = world

    # Seen from the front and a little above, like the office map.
    cam_data = bpy.data.cameras.new("camera")
    cam_data.type = "ORTHO"
    # Wide enough for the tallest hair (spikes, buns) and the biggest builds.
    cam_data.ortho_scale = 3.3
    cam = bpy.data.objects.new("camera", cam_data)
    # Low enough that the face reads clearly, high enough to match the map's slight top-down view.
    cam.location = (0, -8, 3.1)
    direction = Vector((0, 0, 1.12)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam

    def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        if kind == "AREA":
            data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(obj)

    light("key", "SUN", (-3, -4, 6), 3.2, (1.0, 0.96, 0.9))
    light("fill", "AREA", (4, -3, 2), 180, (0.85, 0.9, 1.0), size=4)
    light("rim", "AREA", (0, 4, 4), 260, (0.75, 0.8, 1.0), size=3)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--looks", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--ids", default="")
    parser.add_argument("--size", type=int, default=192)
    args = parser.parse_args(argv)

    with open(args.looks, encoding="utf-8") as f:
        looks = json.load(f)
    ids = [i for i in args.ids.split(",") if i] or list(looks)

    manifest_path = os.path.join(args.out, "manifest.json")
    manifest = {"poses": POSES, "ids": []}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

    for member_id in ids:
        for pose in POSES:
            reset_scene(args.size)
            build(looks[member_id], pose)
            target = os.path.join(args.out, member_id, f"{pose}.png")
            os.makedirs(os.path.dirname(target), exist_ok=True)
            bpy.context.scene.render.filepath = os.path.abspath(target)
            bpy.ops.render.render(write_still=True)
            print(f"rendered {member_id}/{pose}")
        if member_id not in manifest["ids"]:
            manifest["ids"].append(member_id)

    manifest["poses"] = POSES
    manifest["ids"] = sorted(manifest["ids"])
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


main()
