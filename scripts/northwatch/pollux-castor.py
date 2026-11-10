import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
from pathlib import Path
import sys, math

output = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, rgb, roughness=.75):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

hull = material('Naval grey', (.25, .29, .31))
structure = material('Light superstructure', (.41, .46, .47))
deck = material('Non-slip deck', (.12, .17, .18))
waterline = material('Boot stripe', (.035, .045, .047))
glass = material('Bridge glass', (.021, .06, .081), .23)
white = material('Markings', (.9, .91, .88))
orange = material('Rescue equipment', (.82, .18, .035))
black = material('Black', (.012, .014, .014))
yellow = material('Belgian yellow', (.98, .69, .025))
red = material('Belgian red', (.69, .035, .03))

def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def box(name, position, dimensions, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Rounded edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj

def rod(name, start, end, radius, mat):
    delta = Vector(end) - Vector(start)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=delta.length,
                                       location=(Vector(start) + Vector(end))/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    return obj



# Reference proportions: bow +Y, 53.5 m overall, 9.2 m beam, water at Z=0.
# Each station carries a separate stem position at the waterline to rake the bow.
stations = [
    (-26.5,3.6,1.65,-26.1,3.47),(-23,4.1,1.65,-23,4.05),
    (-15,4.53,1.72,-15,4.46),(-12,4.59,1.77,-12,4.52),
    (-10.7,4.60,3.28,-10.7,4.55),(-2,4.60,3.35,-2,4.53),
    (8,4.42,3.47,8,4.30),(14,3.64,3.64,14,3.51),
    (19,2.65,3.82,18.5,2.35),(23,1.48,4.02,21.1,1.22),
    (25.2,.70,4.16,22.35,.53),(27,.04,4.29,23.2,.04)
]
def hull_point(station, side, z_fraction):
    y,w,z,wy,ww = station
    return (side*(ww+(w-ww)*z_fraction), wy+(y-wy)*z_fraction, z*z_fraction)

for side in (-1,1):
    for i,(a,b) in enumerate(zip(stations,stations[1:])):
        # Diagonal end of the black working-stern paint, across the hull side.
        if i < 3:
            bands = [(0,0,1,1,black)]
        elif i == 3:
            bands = [(0,0,1,0,black),(1,0,1,1,hull)]
        else:
            bands = [(0,0,1,1,hull)]
        for a0,b0,a1,b1,paint in bands:
            v=[hull_point(a,side,a0),hull_point(b,side,b0),hull_point(b,side,b1),hull_point(a,side,a1)]
            mesh('Hull topsides',v,[(0,1,2,3) if side>0 else (3,2,1,0)],paint)
        v=[hull_point(a,side,0),hull_point(b,side,0),
           (side*b[4]*.60,b[3]-.25,-2.35),(side*a[4]*.60,a[3]-.25,-2.35)]
        mesh('Underwater hull',v,[(3,2,1,0) if side>0 else (0,1,2,3)],waterline)
for a,b in zip(stations,stations[1:]):
    mesh('Weather deck',[hull_point(a,-1,1),hull_point(a,1,1),hull_point(b,1,1),hull_point(b,-1,1)],[(0,1,2,3)],deck)
mesh('Black transom',[(-3.6,-26.5,1.65),(-3.47,-26.1,0),(3.47,-26.1,0),(3.6,-26.5,1.65)],[(0,1,2,3)],black)

def ring_body(name, base, top, low, high, paint, cap=True):
    n=len(base)
    coords=[(x,y,low) for x,y in base]+[(x,y,high) for x,y in top]
    faces=([tuple(range(n,2*n))] if cap else [])+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,coords,faces,paint)

def outline(width,aft,fore,chamfer):
    return [(-width,aft),(width,aft),(width,fore-chamfer),(width-chamfer,fore),
            (-width+chamfer,fore),(-width,fore-chamfer)]

ring_body('Accommodation',outline(3.55,-10.3,9.5,1.15),outline(3.54,-10.15,9.35,1.13),3.25,6.14,structure)
ring_body('Sloping fore cabin',outline(3.85,-10.36,9.40,1.21),outline(3.24,-8.9,4.9,1.3),6.14,7.13,structure)
ring_body('Wheelhouse sill',outline(3.23,-8.9,4.9,1.3),outline(3.34,-8.95,5.03,1.35),7.13,7.44,structure,cap=False)
base=outline(3.33,-8.93,5.03,1.35)
top=outline(3.64,-9.15,5.68,1.52)
ring_body('Wraparound bridge glazing',base,top,7.44,8.59,glass)
ring_body('Overhanging bridge roof',outline(4.01,-9.56,6.05,1.61),outline(3.86,-9.45,5.93,1.57),8.59,8.80,structure)
for i,(a,b) in enumerate(zip(base,base[1:]+base[:1])):
    A=top[i]; B=top[(i+1)%len(top)]
    panels=max(1,round((Vector(b)-Vector(a)).length/1.40))
    for j in range(panels+1):
        t=j/panels
        rod('Glazing mullion',(*Vector(a).lerp(Vector(b),t),7.40),(*Vector(A).lerp(Vector(B),t),8.64),.047,structure)

def interpolated_top(y):
    for a,b in zip(stations,stations[1:]):
        if a[0]<=y<=b[0]:
            t=(y-a[0])/(b[0]-a[0])
            return (a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t)
    return stations[-1][1:3]


# Photo-matched pennant strokes. Coordinates are in a 1-by-1.52 letter cell.
def beveled_loop(bottom, top):
    return [(0,bottom+.16),(.16,bottom),(.84,bottom),(1,bottom+.16),
            (1,top-.16),(.84,top),(.16,top),(0,top-.16)]

def counter_ring(bottom, top):
    outer=beveled_loop(bottom,top)
    inner=[(.21,bottom+.27),(.28,bottom+.20),(.72,bottom+.20),(.79,bottom+.27),
           (.79,top-.27),(.72,top-.20),(.28,top-.20),(.21,top-.27)]
    return [[outer[i],outer[(i+1)%8],inner[(i+1)%8],inner[i]] for i in range(8)]

pennant_shapes = {
    'P': counter_ring(.64,1.52)+[[(0,0),(.22,0),(.22,.81),(0,.81)]],
    '9': counter_ring(.63,1.52)+[[(.09,0),(.37,0),(1,.61),(1,.84),(.79,.84),(.79,.66)]],
    '0': counter_ring(0,1.52),
    '2': [[(0,0),(1,0),(1,.21),(.27,.21),(.91,.78),(1,.96),(1,1.34),
           (.83,1.52),(.16,1.52),(0,1.35),(0,1.13),(.21,1.13),(.21,1.26),
           (.27,1.31),(.73,1.31),(.79,1.25),(.79,1.03),(.73,.91),(0,.26)]],
}

def topside_width(y,z):
    profile=[hull_point(station,1,min(1,z/station[2])) for station in stations]
    for a,b in zip(profile,profile[1:]):
        if a[1]<=y<=b[1]:
            return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1])
    raise ValueError('Pennant is outside the hull')

def mark_pennant(side):
    for i,glyph in enumerate('P902'):
        for paint,depth,shadow_u,shadow_v in [(black,.060,.065,-.072),(white,.083,0,0)]:
            for stroke in pennant_shapes[glyph]:
                polygon=[Vector((u,v,0)) for u,v in stroke]
                triangles=[tuple(polygon[index] for index in tri) for tri in tessellate_polygon([polygon])]
                for _ in range(2):
                    divided=[]
                    for a,b,c in triangles:
                        ab,bc,ca=(a+b)/2,(b+c)/2,(c+a)/2
                        divided.extend([(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)])
                    triangles=divided
                vertices=[]
                faces=[]
                for triangle in triangles:
                    face=tuple(range(len(vertices),len(vertices)+3))
                    faces.append(face if side>0 else face[::-1])
                    for u,v,_ in triangle:
                        y=15.2+side*((i-1.5)*1.24+(u-.5)*1.08+.22*v+shadow_u)
                        z=.79+1.26*v+shadow_v
                        vertices.append((side*(topside_width(y,z)+depth),y,z))
                mesh('Pennant P902',vertices,faces,paint)


def rail(points, levels=(.48,.95)):
    for x,y,z in points:
        rod('Guardrail upright',(x,y,z),(x,y,z+levels[-1]),.033,structure)
    for a,b in zip(points,points[1:]):
        for dz in levels:
            rod('Guardrail tube',(a[0],a[1],a[2]+dz),(b[0],b[1],b[2]+dz),.029,structure)

for side in (-1,1):
    for ys in [(-25.7,-23,-20,-17,-14,-12.1),(-10.6,-8,-5,-2,1,4,7,9.65)]:
        rail([(side*(w-.13),y,z) for y in ys for w,z in [interpolated_top(y)]])
    # Forward bulwarks continue the hull plating above the weather deck.
    fore=[(10.05,.19),(12,.54),(14,.73),(19,.76),(23,.69),(25.2,.62),(27,.57)]
    for (y0,h0),(y1,h1) in zip(fore,fore[1:]):
        w0,z0=interpolated_top(y0)
        w1,z1=interpolated_top(y1)
        a=(side*w0,y0,z0-.015)
        b=(side*w1,y1,z1-.015)
        A=(side*max(.01,w0-.045),y0,z0+h0)
        B=(side*max(.01,w1-.045),y1,z1+h1)
        face=(0,1,2,3) if side>0 else (3,2,1,0)
        mesh('Solid foredeck bulwark',[a,b,B,A],[face,face[::-1]],hull)
        rod('Bulwark cap',A,B,.041,structure)
    box('Bridge wing platform',(side*3.55,-7.1,7.24),(.63,3.75,.14),deck,.034)
    rail([(side*3.87,-8.96,7.30),(side*3.87,-7.22,7.30),(side*3.87,-5.40,7.30)],(.32,.66))
    box('Bridge wing name board',(side*3.395,-6.65,7.11),(.07,1.24,.26),black,.025)
    for y in (13.0,14.7,16.35,18.0,20.0,22.35):
        w,z=interpolated_top(y)
        port=box('Inset forward fairlead',(side*(w-.07),y,z-.64),(.17,.52,.22),waterline,.068)
        port.rotation_euler.z=side*.19
    for y in (-7.9,-5.5,-3,0,2.7,5.4):
        box('Weather door',(side*3.51,y,4.37),(.08,.73,1.63),structure,.025)
        box('Door latch',(side*3.56,y-.20,4.42),(.05,.10,.06),black)
    for y in (-9.6,-5.4,0,6.7,10.8):
        w,z=interpolated_top(y)
        rod('Round hull port',(side*(w-.12),y,2.48),(side*(w+.015),y,2.48),.17,black)
    for y in (-8.4,-1.7,6.9):
        bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=6,location=(side*3.82,y,4.11),
            rotation=(0,math.pi/2,0),major_radius=.28,minor_radius=.052)
        bpy.context.object.name='Lifebuoy'
        bpy.context.object.data.materials.append(orange)
    mark_pennant(side)
    w,z=interpolated_top(19.5)
    box('Anchor recess',(side*(w-.08),19.5,1.59),(.16,.72,.46),black,.06)
    rod('Anchor shank',(side*(w+.01),19.5,1.33),(side*(w+.01),19.5,1.9),.085,waterline)

# Foredeck fittings and open aft working deck.
for y,x in [(23,0),(20,0),(16.4,-1.4),(15.9,1.3),(-24,-2.4),(-24,2.4)]:
    w,z=interpolated_top(y)
    box('Mooring fitting',(x,y,z+.23),(.60,.76,.44),structure,.075)
box('Raised forward service platform',(0,10.45,5.02),(4.25,2.18,.18),structure,.065)
for side in (-1,1):
    rail([(side*2.08,9.68,5.11),(side*2.08,11.47,5.11)],(.38,.77))
rail([(-2.04,11.48,5.11),(-.7,11.48,5.11),(.7,11.48,5.11),(2.04,11.48,5.11)],(.38,.77))
box('Foredeck pedestal',(0,10.84,5.43),(1.07,1.08,.68),structure,.14)
box('Foredeck mount',(0,10.84,5.96),(.83,.95,.56),structure,.16)
rod('Mount detail',(0,11.04,5.99),(0,11.77,6.02),.048,waterline)
for side in (-1,1):
    ring_body('RHIB collar',[(side*1.83-.89,-23.9),(side*1.83+.89,-23.9),(side*1.83+.93,-18.5),(side*1.83,-17.2),(side*1.83-.93,-18.5)],
        [(side*1.83-.98,-24.05),(side*1.83+.98,-24.05),(side*1.83+1,-18.5),(side*1.83,-16.94),(side*1.83-1,-18.5)],1.87,2.65,black)
    box('RHIB console',(side*1.83,-20.1,2.73),(.67,.80,.83),structure,.12)
    box('RHIB equipment',(side*1.83,-21.1,2.63),(1.03,1.12,.43),orange,.12)
    x=side*3.35
    rod('Davit upright',(x,-14.8,1.78),(x,-14.8,4.59),.105,structure)
    rod('Davit arm',(x,-14.8,4.59),(side*1.81,-17.4,4.12),.092,structure)
    rod('Davit brace',(x,-14.8,3.28),(side*2.44,-16.4,4.28),.067,structure)
box('Exhaust casing',(0,-10.75,4.12),(3.8,2.8,1.75),structure,.12)
box('Exhaust outlets',(0,-11.1,5.03),(2.4,1.1,.22),black,.07)
box('Working deck locker',(0,-24.8,2.17),(1.33,1.08,1.06),structure,.07)

# Raked lattice mast, radar bars, antenna domes and long whip aerials.

# Open, raked portal with rounded shoulders, shelves and a side ladder.
def portal(t):
    y=-5.8-2.65*t
    return y, 8.89+7.21*t

for side in (-1,1):
    points=[(side*w,*portal(t)) for w,t in [(1.63,0),(1.42,.44),(1.26,.83),(1.17,.94),(1.04,.979),(.84,1)]]
    for a,b in zip(points,points[1:]):
        rod('Lattice mast portal',a,b,.115,structure)
    rod('Lattice mast rear stay',(side*1.27,-8.5,8.9),(side*1.36,-6.97,12.06),.076,structure)
rod('Lattice mast arch cap',(-.84,*portal(1)),(.84,*portal(1)),.115,structure)
for t,width in [(.35,3.65),(.62,2.99),(.83,4.55)]:
    y,z=portal(t)
    box('Mast cross platform',(0,y+.14,z),(width,.84,.145),structure,.055)
for t in (.32,.42,.52,.62,.72,.82,.92):
    y,z=portal(t)
    rod('Mast cross ladder rung',(1.30,y,z),(1.64,y,z),.026,structure)

for x,y,z,width in [(0,-4.7,11.52,3.75),(0,-6.85,13.94,2.65)]:
    rod('Radar support',(0,y-.80,z-.23),(0,y,z),.085,structure)
    box('Radar scanner',(x,y,z),(width,.27,.24),white,.045)
for x,y,z,r in [(-2.0,-2.6,9.26,.59),(2.10,-2.4,9.48,.73),(0,-8.85,16.65,.27),(-2.7,2.9,9.16,.24),(2.7,2.8,9.16,.24)]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14,ring_count=8,radius=r,location=(x,y,z))
    bpy.context.object.name='Radome'
    bpy.context.object.data.materials.append(white)
for x,y,z,h in [(-2.55,-4.2,8.88,7.9),(2.48,-5,8.88,6.8),(0,-8.84,16.62,1.28),(0,23.1,4.09,1.78)]:
    rod('Whip aerial',(x,y,z),(x,y-.28,z+h),.021,black)
rod('Ensign staff',(0,-25.2,1.66),(0,-25.2,4.48),.058,structure)

flag_mat = material('Belgian naval ensign', (.9,.9,.9))
flag_verts = []
for i in range(11):
    u = i/10
    x = .56*u + .19*math.sin(8*u)*u
    y = -25.2-2.1*u
    z = 4.43-.22*u+.10*math.sin(9*u)*u
    flag_verts.extend([(x,y,z-1.38),(x,y,z)])
flag = mesh('Belgian Navy ensign',flag_verts,[(i,i+2,i+3,i+1) for i in range(0,20,2)],flag_mat)
flag_uv = flag.data.uv_layers.new()
for loop in flag.data.loops:
    i=loop.vertex_index
    flag_uv.data[loop.index].uv = (i//2/10, i%2)

def paint_texture(mat, name):
    path = Path(__file__).parent / name
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(path))
    tex.image.pack()
    shader = mat.node_tree.nodes.get('Principled BSDF')
    mat.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])

paint_texture(flag_mat, 'northwatch-ensign.png')



# Visible fittings around the bridge and working deck.
for side in (-1,1):
    for y in (-7.8,-5.0,-1.95,1.0,4.0,6.8):
        box('Cabin panel joint',(side*3.553,y,4.74),(.014,.026,1.93),waterline)
    for y in (-8.9,-4.1,2.1,6.1):
        box('Weatherproof deck lamp',(side*3.56,y,5.72),(.13,.48,.15),white,.055)
    for y in (-6.8,-2.9,3.4):
        box('Vent inset',(side*3.56,y,5.17),(.11,.42,.55),waterline,.056)
        for z in (4.99,5.10,5.21,5.32):
            rod('Vent louver',(side*3.624,y-.15,z),(side*3.624,y+.15,z),.019,structure)
    rod('Exterior service pipe',(side*3.58,-8.42,3.62),(side*3.58,-8.42,5.82),.028,structure)
    for y in (-20.1,-23.9):
        rod('Aft rubbing strake',(side*3.67,y-.87,1.18),(side*3.67,y+.87,1.18),.082,waterline)
    for y in (-8.36,4.61):
        x=side*3.87
        rod('Searchlight mount',(x,y,8.65),(x,y,9.18),.061,structure)
        rod('Searchlight casing',(x,y-.12,9.19),(x,y+.14,9.19),.145,waterline)
        rod('Searchlight lens',(x,y+.14,9.19),(x,y+.159,9.19),.111,white)
for x in (-1.9,-.65,.65,1.9):
    rod('Bridge glazing wiper',(x,5.29,7.67),(x+.34,5.61,8.31),.022,waterline)
for y in (-13.12,-16.18):
    box('Aft deck grating',(0,y,1.84),(.93,.58,.054),waterline,.035)
    for x in (-.34,-.17,0,.17,.34):
        rod('Grating bar',(x,y-.24,1.876),(x,y+.24,1.876),.015,structure)

# Layout inferred from exterior imagery. Interior and integration points are illustrative.
helm_dark = material('Helm charcoal',(.037,.054,.061),.67)
helm_floor = material('Bridge floor',(.18,.23,.22),.89)
screen = material('Display glass',(.045,.19,.22),.36)
rubber = material('Seat upholstery',(.055,.077,.081),.94)
ring_body('Helm floor',outline(3.22,-8.86,4.84,1.32),outline(3.22,-8.86,4.84,1.32),7.12,7.20,helm_floor)

for x,y,heading in [(-1.76,3.07,-.15),(0,3.52,0),(1.77,3.07,.15),(-2.48,-1.8,-math.pi/2),(2.44,-1.8,math.pi/2)]:
    console=box('Helm console',(x,y,7.69),(1.48,.78,.94),helm_dark,.075)
    console.rotation_euler.z=heading
    for i in (-.32,.32):
        center=(x+i*math.cos(heading),y+i*math.sin(heading)-.17,8.21)
        panel=box('Console instrument bezel',center,(.59,.16,.47),black,.042)
        panel.rotation_euler=(.23,0,heading)
        monitor=box('Console display',(center[0]+.084*math.sin(heading),center[1]-.084*math.cos(heading),center[2]),(.49,.018,.34),screen,.021)
        monitor.rotation_euler=(.23,0,heading)
    for i in (-.45,-.29,-.13,.15,.31,.47):
        box('Console control key',(x+i,y-.33,8.179),(.067,.072,.033),structure,.006)
for x,y in [(-1.68,1.55),(0,1.95),(1.68,1.55)]:
    rod('Helm seat pedestal',(x,y,7.19),(x,y,7.63),.11,helm_dark)
    box('Seat cushion',(x,y,7.69),(.62,.57,.18),rubber,.075)
    back=box('Seat back',(x,y-.25,7.99),(.59,.13,.57),rubber,.055)
    back.rotation_euler.x=.13
    for side in (-1,1):
        box('Seat armrest',(x+side*.34,y-.02,7.84),(.09,.44,.08),helm_dark,.024)
# Wheel, hub and spokes provide a clear reference point at the primary helm.
bpy.ops.mesh.primitive_torus_add(major_segments=18,minor_segments=6,location=(0,3.04,8.16),
    rotation=(math.pi/2,0,0),major_radius=.16,minor_radius=.025)
bpy.context.object.name='Steering wheel rim'
bpy.context.object.data.materials.append(rubber)
rod('Steering wheel hub',(0,3.02,8.16),(0,3.24,8.16),.059,helm_dark)
for angle in (0,math.tau/3,math.tau*2/3):
    rod('Steering wheel spoke',(0,3.035,8.16),(.15*math.cos(angle),3.035,8.16+.15*math.sin(angle)),.014,helm_dark)
box('Chart table',(-1.73,-5.58,7.69),(1.86,1.23,.99),helm_dark,.06)
box('Chart table surface',(-1.73,-5.58,8.21),(1.93,1.30,.075),structure,.025)
box('Aft comms cabinet',(2.18,-6.10,7.83),(1.47,.67,1.26),helm_dark,.035)
for x in (1.8,2.18,2.56):
    box('Comms control face',(x,-5.757,8.12),(.29,.022,.37),screen,.018)
for side in (-1,1):
    for y in (-7.2,-3.25,1.1):
        rod('Interior window grab rail',(side*3.17,y-.53,7.66),(side*3.17,y+.53,7.66),.037,structure)

def ladder(name,x,y,z0,z1,shift):
    for dx in (-.29,.29):
        rod(name,(x+dx,y,z0),(x+dx,y+shift,z1),.039,structure)
    for i in range(1,math.ceil((z1-z0)/.28)):
        t=i/math.ceil((z1-z0)/.28)
        z=z0+(z1-z0)*t
        rod('Ladder rung',(x-.29,y+shift*t,z),(x+.29,y+shift*t,z),.028,structure)

for side in (-1,1):
    ladder('Aft deck access ladder',side*3.74,-12.85,1.74,3.29,1.87)
    ladder('Wheelhouse roof ladder',side*2.98,-10.1,5.57,8.95,.64)
    for y in (17.4,15.5,11.2,7.2,1.0,-6.7,-20.9,-24.2):
        w,z=interpolated_top(y)
        x=side*(w-.39)
        box('Deck edge cleat',(x,y,z+.12),(.30,.39,.16),waterline,.04)
    for y in (-18.6,-21.2,-23.5):
        box('RHIB cradle',(side*1.84,y,1.87),(1.78,.21,.24),structure,.04)
    for y in (-16.0,-13.1):
        box('Working deck storage',(side*2.71,y,2.11),(1.00,.82,.79),structure,.065)
    for y in (-4.5,1.15,5.75):
        box('Weather deck drain',(side*4.02,y,3.49),(.31,.26,.024),waterline,.024)
box('Foredeck chain locker',(0,17.55,3.92),(1.23,1.20,.30),structure,.05)
rod('Foredeck winch axle',(-.58,15.1,4.05),(.58,15.1,4.05),.24,waterline)
for x in (-.50,.50):
    rod('Winch flange',(x-.055,15.1,4.05),(x+.055,15.1,4.05),.33,structure)
for x,y,z in [(0,7.35,3.54),(0,-24.37,1.70),(-2.07,10.7,3.59),(2.07,10.7,3.59)]:
    box('Flush access hatch',(x,y,z),(.72,.78,.065),structure,.048)

# Empty nodes attach future callouts to the model without embedding trial assumptions.
anchors = [
    ('NW_ANTENNA_BRIDGE_ROOF', (1.22,.94,9.04), 'Example exterior GNSS antenna position'),
    ('NW_ENCLOSURE_WEATHER_DECK', (3.62,-7.4,3.43), 'Example weatherproof enclosure position'),
    ('NW_CABLE_ENTRY_BRIDGE', (3.28,-7.26,7.56), 'Example dedicated cable entry'),
    ('NW_DISPLAY_HELM', (1.78,2.88,8.53), 'Example watch display position'),
    ('NW_POWER_BRIDGE', (2.13,-5.67,7.56), 'Example standalone power connection'),
]
for name,location,description in anchors:
    anchor=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(anchor)
    anchor.location=location
    anchor['description']=description
    anchor['status']='illustrative'

# Bake bevels and batch geometry by material to keep browser draw calls low.
for paint in [hull,structure,deck,waterline,glass,white,orange,black,helm_dark,helm_floor,screen,rubber]:
    def removable(obj):
        return obj.name.startswith(('Overhanging bridge roof','Lattice mast','Mast cross','Mast diagonal','Radar support',
            'Radar scanner','Whip aerial','Radome','Searchlight','Glazing mullion','Wraparound bridge glazing','Bridge glazing wiper'))
    parts=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.data.materials[0]==paint and not removable(obj)]
    if not parts:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    bpy.context.object.name=paint.name

for name,prefixes in [
    ('Bridge roof and mast',('Overhanging bridge roof','Lattice mast','Mast cross','Mast diagonal','Radar support','Radar scanner','Whip aerial','Radome','Searchlight')),
    ('Bridge glazing and mullions',('Glazing mullion','Wraparound bridge glazing','Bridge glazing wiper')),
]:
    parts=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith(prefixes)]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    bpy.context.object.name=name
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_apply=True,export_extras=True)