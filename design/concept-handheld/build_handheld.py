# builds the sps concept handheld from scratch so the model is reproducible
# run: blender --background --factory-startup --python design/concept-handheld/build_handheld.py -- [--out DIR] [--no-render] [--samples N]
# everything is in metres, blender z is up and the front of the handheld faces -y

import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
here = os.path.dirname(os.path.abspath(__file__))
out_dir = argv[argv.index('--out') + 1] if '--out' in argv else here
render_dir = argv[argv.index('--renders') + 1] if '--renders' in argv else os.path.join(out_dir, 'renders')
glb_path = argv[argv.index('--glb') + 1] if '--glb' in argv else os.path.join(here, '..', '..', 'public', 'models', 'sps-handheld-concept.glb')
samples = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 256
do_render = '--no-render' not in argv
random.seed(20261008)

# overall size, matches the 90 x 150 x 26 mm cad enclosure so it fits the site's poses
W, H, D = 0.090, 0.150, 0.026
FRONT = -D / 2          # outside of the front wall
WALL = 0.002
INNER_FRONT = FRONT + WALL
PCB_FRONT = -0.0040     # top copper side of the board
PCB_T = 0.0016
DPAD = Vector((-0.0215, -0.0215))     # x, z
ABXY = Vector((0.0215, -0.0215))
SCREEN_Z = 0.0355
PILL_Z = -0.0615

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'


# ---------- materials ----------

def gltf_output_group():
    # the gltf exporter only writes KHR_materials_volume when it sees this group with a thickness input
    group = bpy.data.node_groups.get('glTF Material Output')
    if group:
        return group
    group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    group.interface.new_socket(name='Thickness', in_out='INPUT', socket_type='NodeSocketFloat')
    group.nodes.new('NodeGroupInput')
    return group


def material(name, colour, rough=0.5, metal=0.0, transmission=0.0, ior=1.45, emission=None, strength=0.0, coat=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*srgb(colour), 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Transmission Weight'].default_value = transmission
    bsdf.inputs['IOR'].default_value = ior
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Alpha'].default_value = alpha
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*srgb(emission), 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat


def srgb(hex_colour):
    value = hex_colour.lstrip('#')
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels)


shell_mat = material('sps_shell', '#d6a6f7', rough=0.05, transmission=1.0, ior=1.49, coat=0.4)
tree = shell_mat.node_tree
absorb = tree.nodes.new('ShaderNodeVolumeAbsorption')
absorb.inputs['Color'].default_value = (*srgb('#b061e6'), 1)
absorb.inputs['Density'].default_value = 55.0
tree.links.new(absorb.outputs['Volume'], tree.nodes['Material Output'].inputs['Volume'])
gltf_node = tree.nodes.new('ShaderNodeGroup')
gltf_node.node_tree = gltf_output_group()
gltf_node.inputs['Thickness'].default_value = WALL

pcb_mat = material('sps_pcb', '#6531a4', rough=0.38, coat=0.25)
trace_mat = material('sps_trace', '#8a5bd0', rough=0.32, metal=0.25)
silk_mat = material('sps_silk', '#e9def8', rough=0.6)
chip_mat = material('sps_chip', '#17141d', rough=0.42)
gold_mat = material('sps_gold', '#d9b15c', rough=0.28, metal=1.0)
metal_mat = material('sps_metal', '#c9c6d0', rough=0.25, metal=1.0)
screw_mat = material('sps_screw', '#8b5ed6', rough=0.22, metal=1.0)
part_mat = material('sps_part', '#b88a5a', rough=0.5)
button_mat = material('sps_button', '#ff9411', rough=0.34, coat=0.5)
pill_mat = material('sps_pill', '#77767f', rough=0.55)
pad_mat = material('sps_pad', '#6a2fae', rough=0.45)
speaker_mat = material('sps_speaker', '#c9a0ee', rough=0.5)
lcd_frame_mat = material('sps_lcd_frame', '#0b0a10', rough=0.3)
flex_mat = material('sps_flex', '#9a5a22', rough=0.35, metal=0.3)
led_white = material('sps_led_white', '#ffffff', rough=0.3, emission='#ffffff', strength=6)
led_red = material('sps_led_red', '#ff4a4a', rough=0.3, emission='#ff3b3b', strength=6)
led_green = material('sps_led_green', '#5dff8a', rough=0.3, emission='#4dff7c', strength=6)


# ---------- screen texture ----------

GLYPHS = {
    'l': ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.', '.....'],
    'o': ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.', '.....'],
    'a': ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####', '.....'],
    'd': ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####', '.....'],
    'i': ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.', '.....'],
    'n': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#', '.....'],
    'g': ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
    '.': ['..', '..', '..', '..', '..', '##', '##', '..'],
}


def screen_image(width=160, height=120, cell=4):
    # logical lcd pixels, each one drawn as a cell with a dark gap so it reads as a dot matrix
    lit = [[0.0] * width for _ in range(height)]

    def rect(x0, y0, x1, y1, value=1.0):
        for y in range(max(0, y0), min(height, y1)):
            for x in range(max(0, x0), min(width, x1)):
                lit[y][x] = value

    # progress bar outline and a segmented fill about two thirds along
    bx0, by0, bx1, by1 = 22, 34, 138, 47
    rect(bx0, by0, bx1, by0 + 1); rect(bx0, by1 - 1, bx1, by1)
    rect(bx0, by0, bx0 + 1, by1); rect(bx1 - 1, by0, bx1, by1)
    fill = bx0 + 3 + int((bx1 - bx0 - 6) * 0.66)
    for x in range(bx0 + 3, fill, 3):
        rect(x, by0 + 3, x + 2, by1 - 3)
    rect(fill, by0 + 3, bx1 - 3, by1 - 3, 0.12)

    text = 'loading...'
    scale = 2
    widths = [len(GLYPHS[c][0]) for c in text]
    total = sum(widths) * scale + (len(text) - 1) * scale
    x = (width - total) // 2
    for c, w in zip(text, widths):
        for row, line in enumerate(GLYPHS[c]):
            for col, bit in enumerate(line):
                if bit == '#':
                    rect(x + col * scale, 62 + row * scale, x + (col + 1) * scale, 62 + (row + 1) * scale)
        x += (w + 1) * scale

    px_w, px_h = width * cell, height * cell
    image = bpy.data.images.new('sps_screen_loading', px_w, px_h, alpha=False)
    pixels = [0.0] * (px_w * px_h * 4)
    on = (0.93, 0.93, 0.95)
    off = (0.075, 0.075, 0.085)
    gap = (0.02, 0.02, 0.025)
    for py in range(px_h):
        ly = height - 1 - py // cell   # blender images start at the bottom row
        for px in range(px_w):
            i = (py * px_w + px) * 4
            if px % cell == cell - 1 or py % cell == cell - 1:
                colour = gap
            else:
                v = lit[ly][px // cell]
                colour = tuple(off[k] + (on[k] - off[k]) * v for k in range(3))
            pixels[i:i + 4] = (*colour, 1.0)
    image.pixels = pixels
    image.pack()
    return image


screen_tex = screen_image()
screen_mat = material('sps_screen', '#000000', rough=0.18)
bsdf = screen_mat.node_tree.nodes['Principled BSDF']
tex_node = screen_mat.node_tree.nodes.new('ShaderNodeTexImage')
tex_node.image = screen_tex
tex_node.interpolation = 'Closest'
screen_mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value = 1.6
bsdf.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1)


# ---------- mesh helpers ----------

def rounded_outline(w, h, r, segments=8):
    r = min(r, w / 2, h / 2)
    points = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for cx, cz, start in corners:
        for s in range(segments + 1):
            a = math.radians(start + 90 * s / segments)
            points.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return points


def prism(name, outline, y0, y1, mat, centre=(0, 0), bevel=0.0, bevel_segments=2, smooth=True):
    # extrudes an xz outline between two y planes
    bm = bmesh.new()
    front = [bm.verts.new((centre[0] + x, y0, centre[1] + z)) for x, z in outline]
    back = [bm.verts.new((centre[0] + x, y1, centre[1] + z)) for x, z in outline]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = bevel_segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = False
    if smooth:
        for poly in mesh.polygons:
            poly.use_smooth = True
        mesh.set_sharp_from_angle(angle=math.radians(35))
    return obj


def box(name, size, location, mat, bevel=0.0):
    w, d, h = size
    outline = [(w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2), (w / 2, -h / 2)]
    return prism(name, outline, location[1] - d / 2, location[1] + d / 2, mat, (location[0], location[2]), bevel=bevel, bevel_segments=1)


def cylinder(name, radius, y0, y1, centre, mat, segments=24, bevel=0.0):
    outline = [(radius * math.cos(2 * math.pi * i / segments), radius * math.sin(2 * math.pi * i / segments)) for i in range(segments)]
    return prism(name, outline, y0, y1, mat, centre, bevel=bevel, bevel_segments=2)


def cross_outline(arm, half):
    a, h = arm, half
    return [(h, a), (-h, a), (-h, h), (-a, h), (-a, -h), (-h, -h), (-h, -a), (h, -a), (h, -h), (a, -h), (a, h), (h, h)]


def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objects, name):
    # merge small parts that share a look into one mesh to keep draw calls low
    for obj in objects:
        apply_all(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = name
    merged.data.name = name
    return merged


# ---------- shell ----------

shell = prism('sps_shell', rounded_outline(W, H, 0.0075, 10), FRONT, D / 2, shell_mat, bevel=0.0022, bevel_segments=4)
apply_all(shell)
solid = shell.modifiers.new('wall', 'SOLIDIFY')
solid.thickness = WALL
solid.offset = 1.0        # grow inward, the normals face out
solid.use_even_offset = True
apply_all(shell)

cutters = []
cutters.append(prism('cut_dpad', cross_outline(0.0118, 0.0047), FRONT - 0.003, INNER_FRONT + 0.001, shell_mat, DPAD))
for dx, dz in ((0, 0.0083), (0.0083, 0), (0, -0.0083), (-0.0083, 0)):
    cutters.append(cylinder('cut_btn', 0.0047, FRONT - 0.003, INNER_FRONT + 0.001, (ABXY.x + dx, ABXY.y + dz), shell_mat, 28))
for x in (-0.0105, 0.0105):
    cutters.append(prism('cut_pill', rounded_outline(0.0182, 0.0074, 0.0037, 6), FRONT - 0.003, INNER_FRONT + 0.001, shell_mat, (x, PILL_Z)))
# cartridge slot through the top wall, behind the board
cutters.append(box('cut_slot', (0.052, 0.0112, 0.006), (0, 0.0062, H / 2 - 0.001), shell_mat))
# usb-c port through the bottom wall
cutters.append(box('cut_usb', (0.0092, 0.0034, 0.006), (0, -0.0002, -H / 2 + 0.001), shell_mat))
for cutter in cutters:
    apply_all(cutter)
    mod = shell.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    apply_all(shell)
for cutter in cutters:
    bpy.data.objects.remove(cutter, do_unlink=True)
for obj in [o for o in bpy.data.objects if o.name.startswith('cut_')]:
    bpy.data.objects.remove(obj, do_unlink=True)
for poly in shell.data.polygons:
    poly.use_smooth = True
shell.data.set_sharp_from_angle(angle=math.radians(35))

# screw posts are part of the shell moulding
posts = []
SCREWS = [(-0.0385, 0.0668), (0.0385, 0.0668), (-0.0385, 0.0030), (0.0385, 0.0030), (-0.0385, -0.0668), (0.0385, -0.0668)]
for x, z in SCREWS:
    posts.append(cylinder('post', 0.0029, INNER_FRONT, D / 2 - WALL, (x, z), shell_mat, 20))
posts = join(posts, 'sps_posts')


# ---------- board ----------

pcb = prism('sps_pcb', rounded_outline(0.083, 0.143, 0.005, 6), PCB_FRONT, PCB_FRONT + PCB_T, pcb_mat)
# screw clearance holes in the board
for x, z in SCREWS:
    c = cylinder('cut_hole', 0.0031, PCB_FRONT - 0.001, PCB_FRONT + PCB_T + 0.001, (x, z), pcb_mat, 20)
    mod = pcb.modifiers.new('hole', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.solver = 'EXACT'; mod.object = c
    apply_all(pcb)
    bpy.data.objects.remove(c, do_unlink=True)

top = PCB_FRONT  # parts grow toward -y from here


def on_board(height):
    return top - height, top


def keepout(x, z):
    # areas covered by the screen, pads, chips and pills where traces would be hidden or look messy
    zones = [((0, SCREEN_Z), (0.039, 0.031)), (DPAD, (0.0150, 0.0150)), (ABXY, (0.0160, 0.0160)), ((0, -0.0205), (0.0062, 0.0062)),
             ((-0.0165, -0.0450), (0.0075, 0.0075)), ((0.0215, -0.0455), (0.0085, 0.0085))]
    for (cx, cz), (hx, hz) in zones:
        if abs(x - cx) < hx and abs(z - cz) < hz:
            return True
    return any(abs(x - sx) < 0.0045 and abs(z - sz) < 0.0045 for sx, sz in SCREWS)


traces = []
vias = []
for _ in range(240):
    x = random.uniform(-0.038, 0.038)
    z = random.uniform(-0.068, 0.068)
    if keepout(x, z):
        continue
    width = random.choice((0.00028, 0.00035, 0.0005))
    horizontal = random.random() < 0.5
    for _ in range(random.randint(2, 5)):
        length = random.uniform(0.003, 0.014)
        nx, nz = (x + random.choice((-1, 1)) * length, z) if horizontal else (x, z + random.choice((-1, 1)) * length)
        nx = max(-0.039, min(0.039, nx))
        nz = max(-0.069, min(0.069, nz))
        if keepout(nx, nz):
            break
        cx, cz = (x + nx) / 2, (z + nz) / 2
        sx = abs(nx - x) + width if horizontal else width
        sz = width if horizontal else abs(nz - z) + width
        traces.append(box('trace', (sx, 0.00006, sz), (cx, top - 0.00003, cz), trace_mat))
        x, z = nx, nz
        horizontal = not horizontal
    if random.random() < 0.8:
        vias.append(cylinder('via', 0.00042, top - 0.00008, top, (x, z), gold_mat, 8))
traces = join(traces, 'sps_traces')

# silkscreen marks: outlines around the parts and a little label strip
silk = []
for cx, cz, w, h in ((0, -0.0205, 0.0122, 0.0122), (-0.0165, -0.045, 0.0150, 0.0150), (0.0215, -0.0455, 0.0170, 0.0170)):
    for sx, sz, px, pz in ((w, 0.0003, 0, h / 2), (w, 0.0003, 0, -h / 2), (0.0003, h, w / 2, 0), (0.0003, h, -w / 2, 0)):
        silk.append(box('silk', (sx, 0.00004, sz), (cx + px, top - 0.00002, cz + pz), silk_mat))
for i in range(6):
    silk.append(box('silk', (0.0011, 0.00004, 0.0016), (0.010 + i * 0.0016, top - 0.00002, -0.0668), silk_mat))
silk = join(silk, 'sps_silk')

# chips
chips = []
pins = []


def qfp(cx, cz, size, height, pins_per_side, pitch):
    chips.append(box('chip', (size, height, size), (cx, top - height / 2 - 0.0002, cz), chip_mat, bevel=0.0002))
    start = -(pins_per_side - 1) * pitch / 2
    for i in range(pins_per_side):
        o = start + i * pitch
        for px, pz, sx, sz in ((o, size / 2 + 0.0006, 0.00022, 0.0013), (o, -size / 2 - 0.0006, 0.00022, 0.0013), (size / 2 + 0.0006, o, 0.0013, 0.00022), (-size / 2 - 0.0006, o, 0.0013, 0.00022)):
            pins.append(box('pin', (sx, 0.00025, sz), (cx + px, top - 0.000125, cz + pz), gold_mat))


qfp(0.0, -0.0205, 0.0092, 0.0011, 10, 0.00075)        # main mcu between the controls
qfp(-0.0165, -0.0450, 0.0118, 0.0013, 12, 0.00080)    # the bigger chip lower left
chips.append(box('chip', (0.0060, 0.0010, 0.0042), (-0.0285, top - 0.0005, -0.0340), chip_mat, bevel=0.0002))
chips.append(box('chip', (0.0050, 0.0009, 0.0050), (-0.0290, top - 0.00045, -0.0520), chip_mat, bevel=0.0002))
chips.append(box('chip', (0.0050, 0.0009, 0.0035), (0.0040, top - 0.00045, -0.0400), chip_mat, bevel=0.0002))
chips.append(box('chip', (0.0070, 0.0012, 0.0050), (0.0080, top - 0.0006, -0.0530), chip_mat, bevel=0.0002))
chips.append(box('chip', (0.0040, 0.0008, 0.0040), (0.0300, top - 0.0004, -0.0060), chip_mat, bevel=0.0002))
for i in range(5):
    chips.append(box('chip', (0.0016, 0.0009, 0.0026), (-0.0360 + i * 0.0024, top - 0.00045, -0.0600), chip_mat))
# passives
parts = []
for _ in range(150):
    x = random.uniform(-0.037, 0.037)
    z = random.uniform(-0.066, 0.004)
    if keepout(x, z):
        continue
    w, h = random.choice(((0.0016, 0.0008), (0.0010, 0.0005), (0.0020, 0.0012)))
    if random.random() < 0.5:
        w, h = h, w
    parts.append(box('part', (w, 0.0005, h), (x, top - 0.00025, z), part_mat if random.random() < 0.55 else chip_mat))
    pins.append(box('pin', (w * 0.22 if w > h else w, 0.00052, h if w > h else h * 0.22), (x - (w * 0.39 if w > h else 0), top - 0.00026, z - (0 if w > h else h * 0.39)), metal_mat))
chips = join(chips, 'sps_chips')
parts = join(parts, 'sps_parts')

# connector for the cartridge slot on the back of the board, lines up with the slot in the top wall
slot_block = box('sps_slot', (0.056, 0.0090, 0.010), (0, PCB_FRONT + PCB_T + 0.0047, 0.0615), chip_mat, bevel=0.0003)
for i in range(16):
    pins.append(box('pin', (0.0016, 0.0004, 0.006), (-0.0225 + i * 0.003, PCB_FRONT + PCB_T + 0.0047, 0.0665), gold_mat))
usb = box('sps_usb', (0.0090, 0.0032, 0.0075), (0, -0.0002, -H / 2 + 0.0055), metal_mat, bevel=0.0004)
pins = join(pins + vias, 'sps_pins')

# leds near the bottom left like the reference
leds = [box('sps_led_white', (0.0016, 0.0007, 0.0010), (-0.0360, top - 0.00035, -0.0665), led_white, bevel=0.0001),
        box('sps_led_red', (0.0016, 0.0007, 0.0010), (-0.0335, top - 0.00035, -0.0665), led_red, bevel=0.0001),
        box('sps_led_green', (0.0016, 0.0007, 0.0010), (-0.0310, top - 0.00035, -0.0665), led_green, bevel=0.0001)]

# speaker dot grid
speaker = box('sps_speaker', (0.0150, 0.0010, 0.0150), (0.0215, top - 0.0005, -0.0455), speaker_mat, bevel=0.0004)
dots = []
for i in range(6):
    for j in range(6):
        dots.append(cylinder('dot', 0.00055, top - 0.00102, top - 0.0009, (0.0215 - 0.0055 + i * 0.0022, -0.0455 - 0.0055 + j * 0.0022), chip_mat, 10))
dots = join(dots, 'sps_speaker_dots')


# ---------- screen ----------

screen_front = INNER_FRONT + 0.0012
lcd = prism('sps_lcd_frame', rounded_outline(0.0745, 0.0585, 0.0012, 3), screen_front, PCB_FRONT - 0.0006, lcd_frame_mat, (0, SCREEN_Z), bevel=0.0003, bevel_segments=1)
standoffs = [box('standoff', (0.006, abs(PCB_FRONT - 0.0006 - PCB_FRONT), 0.006), (sx, PCB_FRONT - 0.0003, SCREEN_Z + sz), chip_mat) for sx in (-0.030, 0.030) for sz in (-0.022, 0.022)]
standoffs = join(standoffs, 'sps_standoffs')

# active area as a plane with clean 0..1 uvs so the site can paint it
sw, sh = 0.0680, 0.0510
bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new('UVMap')
y = screen_front - 0.00005
corners = [(-sw / 2, SCREEN_Z - sh / 2, (0, 0)), (sw / 2, SCREEN_Z - sh / 2, (1, 0)), (sw / 2, SCREEN_Z + sh / 2, (1, 1)), (-sw / 2, SCREEN_Z + sh / 2, (0, 1))]
verts = [bm.verts.new((x, y, z)) for x, z, _ in corners]
face = bm.faces.new(verts)
for loop, (_, _, uv) in zip(face.loops, corners):
    loop[uv_layer].uv = uv
bm.normal_update()
if face.normal.y > 0:
    face.normal_flip()
mesh = bpy.data.meshes.new('sps_screen')
bm.to_mesh(mesh)
bm.free()
screen = bpy.data.objects.new('sps_screen', mesh)
scene.collection.objects.link(screen)
screen.data.materials.append(screen_mat)

# flex ribbon from the screen down onto the board, plus its connector
flex = box('sps_flex', (0.030, 0.0003, 0.0060), (0, PCB_FRONT - 0.0012, SCREEN_Z - 0.0585 / 2 - 0.0026), flex_mat)
flex_conn = box('sps_flex_conn', (0.034, 0.0012, 0.0030), (0, PCB_FRONT - 0.0006, SCREEN_Z - 0.0585 / 2 - 0.0060), chip_mat, bevel=0.0002)


# ---------- controls ----------

button_bottom = INNER_FRONT + 0.0010
pad_front = button_bottom - 0.0002
pads = [prism('pad', rounded_outline(0.0265, 0.0265, 0.0045, 6), pad_front, top, pad_mat, DPAD, bevel=0.0006),
        cylinder('pad', 0.0145, pad_front, top, ABXY, pad_mat, 48, bevel=0.0006)]
pads += [prism('pad', rounded_outline(0.0200, 0.0092, 0.0046, 6), pad_front, top, pad_mat, (x, PILL_Z), bevel=0.0005) for x in (-0.0105, 0.0105)]
pads = join(pads, 'sps_pads')

dpad = prism('sps_dpad', cross_outline(0.0112, 0.0041), FRONT - 0.0026, button_bottom, button_mat, DPAD, bevel=0.0009, bevel_segments=3)
# shallow pivot dimple in the middle of the d-pad
dimple = cylinder('cut_dimple', 0.0022, FRONT - 0.0034, FRONT - 0.0021, DPAD, button_mat, 20)
mod = dpad.modifiers.new('dimple', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.solver = 'EXACT'; mod.object = dimple
apply_all(dpad)
bpy.data.objects.remove(dimple, do_unlink=True)

buttons = [cylinder('btn', 0.0041, FRONT - 0.0028, button_bottom, (ABXY.x + dx, ABXY.y + dz), button_mat, 32, bevel=0.0012)
           for dx, dz in ((0, 0.0083), (0.0083, 0), (0, -0.0083), (-0.0083, 0))]
buttons = join(buttons, 'sps_buttons')
pills = [prism('pill', rounded_outline(0.0170, 0.0062, 0.0031, 8), FRONT - 0.0016, button_bottom, pill_mat, (x, PILL_Z), bevel=0.0010, bevel_segments=3) for x in (-0.0105, 0.0105)]
pills = join(pills, 'sps_pills')

# screws on the front face, tinted metal like the reference
screws = []
for x, z in SCREWS:
    screws.append(cylinder('screw', 0.0021, FRONT - 0.0007, FRONT + 0.0001, (x, z), screw_mat, 20, bevel=0.0004))
screws = join(screws, 'sps_screws')
slots = []
for x, z in SCREWS:
    slots.append(box('slot', (0.0024, 0.0004, 0.00045), (x, FRONT - 0.00072, z), chip_mat))
    slots.append(box('slot', (0.00045, 0.0004, 0.0024), (x, FRONT - 0.00072, z), chip_mat))
screw_slots = join(slots, 'sps_screw_slots')

# marks the middle of the cartridge slot so the site can line cartridges up with it
anchor = bpy.data.objects.new('sps_slot_anchor', None)
anchor.location = (0, 0.0062, H / 2)
scene.collection.objects.link(anchor)

for obj in scene.objects:
    if obj.type == 'MESH':
        apply_all(obj)

root = bpy.data.objects.new('sps_handheld_concept', None)
scene.collection.objects.link(root)
for obj in scene.objects:
    if obj is not root:
        obj.parent = root


# ---------- save + export ----------

def patch_glb(path):
    # the exporter skips KHR_materials_volume without a gltf output group and marks every material double sided,
    # so fix both in the json chunk directly
    import json
    import struct
    with open(path, 'rb') as handle:
        data = handle.read()
    json_length = struct.unpack('<I', data[12:16])[0]
    document = json.loads(data[20:20 + json_length])
    binary = data[20 + json_length:]
    for mat in document['materials']:
        mat.pop('doubleSided', None)
        if mat['name'] == 'sps_shell':
            mat.setdefault('extensions', {})['KHR_materials_volume'] = {
                'thicknessFactor': WALL, 'attenuationDistance': 0.02, 'attenuationColor': list(srgb('#b061e6'))}
    used = document.setdefault('extensionsUsed', [])
    if 'KHR_materials_volume' not in used:
        used.append('KHR_materials_volume')
    chunk = json.dumps(document, separators=(',', ':')).encode()
    chunk += b' ' * (-len(chunk) % 4)
    total = 12 + 8 + len(chunk) + len(binary)
    with open(path, 'wb') as handle:
        handle.write(struct.pack('<4sII', b'glTF', 2, total))
        handle.write(struct.pack('<I4s', len(chunk), b'JSON'))
        handle.write(chunk)
        handle.write(binary)


os.makedirs(out_dir, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, 'sps-handheld-concept.blend'), compress=True)

os.makedirs(os.path.dirname(os.path.abspath(glb_path)), exist_ok=True)
# the site paints its own lcd and its csp blocks the blob urls gltf textures load through,
# so the glb ships without the screen texture and the renders keep it
texture_link = screen_mat.node_tree.links[[link.from_node for link in screen_mat.node_tree.links].index(tex_node)]
screen_mat.node_tree.links.remove(texture_link)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(glb_path),
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_materials='EXPORT',
    export_image_format='AUTO',
)

patch_glb(os.path.abspath(glb_path))
screen_mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Emission Color'])
tris = sum(len(p.vertices) - 2 for o in scene.objects if o.type == 'MESH' for p in o.data.polygons)
print(f'SPS_STATS meshes={sum(1 for o in scene.objects if o.type == "MESH")} triangles={tris}')


# ---------- renders ----------

def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def area_light(name, location, target, size, power, colour=(1, 1, 1)):
    data = bpy.data.lights.new(name, 'AREA')
    data.size = size
    data.energy = power
    data.color = colour
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    scene.collection.objects.link(obj)
    look_at(obj, target)
    return obj


if do_render:
    # render only: let shadow rays pass through the shell with a purple tint, otherwise cycles treats
    # everything lit through the plastic as caustics and the board goes dark while the buttons blow out
    nodes, links = shell_mat.node_tree.nodes, shell_mat.node_tree.links
    output = nodes['Material Output']
    principled = nodes['Principled BSDF']
    path = nodes.new('ShaderNodeLightPath')
    clear = nodes.new('ShaderNodeBsdfTransparent')
    clear.inputs['Color'].default_value = (*srgb('#e6c8ff'), 1)
    mix = nodes.new('ShaderNodeMixShader')
    links.new(path.outputs['Is Shadow Ray'], mix.inputs['Fac'])
    links.new(principled.outputs['BSDF'], mix.inputs[1])
    links.new(clear.outputs['BSDF'], mix.inputs[2])
    links.new(mix.outputs['Shader'], output.inputs['Surface'])

    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = 'GPU'
    except Exception:
        scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 16
    scene.cycles.transmission_bounces = 16
    scene.cycles.transparent_max_bounces = 16
    scene.render.film_transparent = True
    scene.cycles.film_transparent_glass = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '16'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.view_settings.exposure = 0.0

    world = bpy.data.worlds.new('studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.38, 0.5, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    scene.world = world

    area_light('key', (-0.35, -0.45, 0.42), (0, 0, 0), 0.35, 5, (1.0, 0.96, 0.92))
    area_light('fill', (0.45, -0.35, 0.05), (0, 0, 0), 0.5, 2.5, (0.85, 0.85, 1.0))
    area_light('rim', (0.25, 0.4, 0.35), (0, 0, 0), 0.25, 8, (0.95, 0.9, 1.0))
    area_light('top', (0.0, -0.1, 0.5), (0, 0, 0), 0.3, 2)

    cam_data = bpy.data.cameras.new('camera')
    cam = bpy.data.objects.new('camera', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    os.makedirs(render_dir, exist_ok=True)

    # three quarter hero like the reference, turned so the right side wall shows
    root.rotation_euler = (math.radians(4), 0, math.radians(-30))
    cam_data.lens = 85
    cam.location = (0.02, -0.455, 0.085)
    look_at(cam, (0.0, 0, 0.0))
    scene.render.resolution_x, scene.render.resolution_y = 1600, 2200
    scene.render.filepath = os.path.join(render_dir, 'sps-handheld-hero.png')
    bpy.ops.render.render(write_still=True)

    # straight front view
    root.rotation_euler = (0, 0, 0)
    cam_data.lens = 100
    cam.location = (0, -0.52, 0)
    look_at(cam, (0, 0, 0))
    scene.render.resolution_x, scene.render.resolution_y = 1500, 2200
    scene.render.filepath = os.path.join(render_dir, 'sps-handheld-front.png')
    bpy.ops.render.render(write_still=True)
    root.rotation_euler = (0, 0, 0)
    print('SPS_RENDERS', render_dir)
